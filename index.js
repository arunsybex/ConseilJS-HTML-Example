const tezosServerUrl = 'https://tezos-dev.cryptonomic-infra.tech:443';
const conseilServerConfig = { url: 'https://conseil-dev.cryptonomic-infra.tech:443', apiKey: 'hooman', network: 'delphinet' };
const uteContractAddress = 'KT1TVMrbibvGTxHZ7ttCDFAx3XGoh2zp2iDQ';

/**
 * This creates a wallet. The KeyStore object should be saved on device securely.
 * The wallet should be created only once, during the first startup after a fresh install.
 */
getNewWallet = async() => {
    return {"status":true,"data":await conseiljssoftsigner.KeyStoreUtils.generateIdentity(),"key":"getNewWallet"}
}

/**
 * This returns the UTE token balance for the user
 */
getUteBalance = async(publicKeyHash) => {
    try {
        const storage = await conseiljs.Tzip7ReferenceTokenHelper.getSimpleStorage(tezosServerUrl, uteContractAddress);
        const mapId = storage.mapid;
        let balance = 0.00;
        balance = await conseiljs.Tzip7ReferenceTokenHelper.getAccountBalance(tezosServerUrl, mapId, publicKeyHash);
        return {"status":true,"data":(balance * 1.0) / 1000000.00,"key":"getUteBalance"}
    }
    catch (e) {
        return {"status":false,"data":0,"key":"getUteBalance"}
    }
}

/**
 * This returns the XTZ balance for the user
 */
getTezosBalance = async (publicKeyHash) => {
    let balance = 0;
    try {
        balance = await conseiljs.TezosNodeReader.getSpendableBalanceForAccount(tezosServerUrl, publicKeyHash);
        return {"status":true,"data":(balance/1000000.00),"key":"getTezosBalance"}
    }
    catch (e) {
        return {"status":false,"data":0,"key":"getTezosBalance"}
    }
}

/**
 * Fetches transactions for a given user
 */

async function getTokenTransactions(tokenAddress, managerAddress) {
    const { url, apiKey, network } = conseilServerConfig;

    let direct = conseiljs.ConseilQueryBuilder.blankQuery();
    direct = conseiljs.ConseilQueryBuilder.addFields(
        direct,
        'timestamp',
        'block_level',
        'source',
        'destination',
        'amount',
        'kind',
        'fee',
        'status',
        'operation_group_hash',
        'parameters'
    );
    direct = conseiljs.ConseilQueryBuilder.addPredicate(direct, 'kind', conseiljs.ConseilOperator.EQ, ['transaction'], false);
    direct = conseiljs.ConseilQueryBuilder.addPredicate(direct, 'status', conseiljs.ConseilOperator.EQ, ['applied'], false);
    direct = conseiljs.ConseilQueryBuilder.addPredicate(direct, 'destination', conseiljs.ConseilOperator.EQ, [tokenAddress], false);
    direct = conseiljs.ConseilQueryBuilder.addPredicate(direct, 'source', conseiljs.ConseilOperator.EQ, [managerAddress], false);
    direct = conseiljs.ConseilQueryBuilder.addOrdering(direct, 'timestamp', conseiljs.ConseilSortDirection.DESC);
    direct = conseiljs.ConseilQueryBuilder.setLimit(direct, 1_000);

    let indirect = conseiljs.ConseilQueryBuilder.blankQuery();
    indirect = conseiljs.ConseilQueryBuilder.addFields(
        indirect,
        'timestamp',
        'block_level',
        'source',
        'destination',
        'amount',
        'kind',
        'fee',
        'status',
        'operation_group_hash',
        'parameters'
    );
    indirect = conseiljs.ConseilQueryBuilder.addPredicate(indirect, 'kind', conseiljs.ConseilOperator.EQ, ['transaction'], false);
    indirect = conseiljs.ConseilQueryBuilder.addPredicate(indirect, 'status', conseiljs.ConseilOperator.EQ, ['applied'], false);
    indirect = conseiljs.ConseilQueryBuilder.addPredicate(indirect, 'destination', conseiljs.ConseilOperator.EQ, [tokenAddress], false);
    indirect = conseiljs.ConseilQueryBuilder.addPredicate(indirect, 'parameters', conseiljs.ConseilOperator.LIKE, [managerAddress], false);
    indirect = conseiljs.ConseilQueryBuilder.addOrdering(indirect, 'timestamp', conseiljs.ConseilOperator.DESC);
    indirect = conseiljs.ConseilQueryBuilder.setLimit(indirect, 1_000);

    return Promise.all([direct, indirect].map(q => conseiljs.TezosConseilClient.getOperations({ url: url, apiKey, network }, network, q)))
        .then(responses =>
            responses.reduce((result, r) => {
                r.forEach(rr => result.push(rr));
                return result;
            })
        )
        .then(transactions => {
            return transactions.sort((a, b) => a.timestamp - b.timestamp);
        });
}

async function getTransactions(userAddress) {
    let newTransactions = (await getTokenTransactions(uteContractAddress,userAddress).catch((e) => {
        console.log('-debug: Error in: getSyncAccount -> getTokenTransactions for:' + userAddress);
        console.error(e);
        return {"status":true,"data":[],"key":"getTransactions"}
    })).filter((obj, pos, arr) => arr.map((o) => o.operation_group_hash).indexOf(obj.operation_group_hash) === pos);

    const addressPattern = '([1-9A-Za-z^OIl]{36})';

    const transferPattern = new RegExp(`Left[(]Left[(]Left[(]Pair"${addressPattern}"[(]Pair"${addressPattern}"([0-9]+)[))))]`);

    newTransactions = newTransactions.map(transaction => {
        const params = transaction.parameters.replace('/\s/g', '');
        if (transferPattern.test(params)) {
            try {
                const parts = params.match(transferPattern);

                return {
                    ...transaction,
                    status: transaction.status !== 'applied' ? 'FAILED' : 'READY',
                    amount: Number(parts[3] / 1000000),
                    source: parts[1],
                    destination: parts[2],
                    direction: parts[1] === userAddress ? 'OUTGOING' : (parts[2] === userAddress ? 'INCOMING' : 'UNKNOWN')
                };
            } catch (e) {
                console.log(e);
            }
        }
    });
    return {"status":true,"data":newTransactions,"key":"getTransactions"}
}