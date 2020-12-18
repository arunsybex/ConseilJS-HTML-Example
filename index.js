getNewWallet = async() => {
    return await KeyStoreUtils.generateIdentity();
}