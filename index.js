getNewWallet = async() => {
    return {"status":true,"data":await conseiljssoftsigner.KeyStoreUtils.generateIdentity(),"key":"getNewWallet"}
}