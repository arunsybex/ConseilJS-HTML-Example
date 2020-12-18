const tezosServerUrl = 'https://tezos-dev.cryptonomic-infra.tech:443';
const conseilServerConfig = { url: 'https://conseil-dev.cryptonomic-infra.tech:443', apiKey: 'hooman', network: 'delphinet' };
const uteContractAddress = 'KT1TVMrbibvGTxHZ7ttCDFAx3XGoh2zp2iDQ';

getNewWallet = async() => {
    return {"status":true,"data":await conseiljssoftsigner.KeyStoreUtils.generateIdentity(),"key":"getNewWallet"}
}

getUteBalance = async(publicKeyHash) => {
    try {
        const storage = await conseiljs.Tzip7ReferenceTokenHelper.getSimpleStorage(tezosServerUrl, uteContractAddress);
        const mapId = storage.mapid;
        let balance = 0.00;
        balance = await conseiljs.Tzip7ReferenceTokenHelper.getAccountBalance(tezosServerUrl, mapId, publicKeyHash);
        return {"status":true,"data":(balance * 1.0) / 1000000.00,"key":"getUteBalance"}
    }
    catch (e) {
        return {"status":true,"data":0,"key":"getUteBalance"}
    }
}