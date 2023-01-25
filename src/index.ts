import {
    EthAsset,
    AztecSdk,
    ConstantKeyStore,
    createAztecSdk,
    EthAddress,
    GrumpkinAddress,
    RecoveryKeyStore,
    TxSettlementTime,
    WalletProvider,
    EthereumRpc,
    JsonRpcProvider,
    randomBytes,
    Permission,
    KeyStore,
    VanillaAztecWalletProvider,
    ProofRequestOptions
} from '@aztec/sdk';


const ETHEREUM_HOST = 'http://localhost:8545',
    ROLLUP_HOST = 'http://localhost:8081',
    mnemonic = "test test test test test test test test test test test junk",
    ADDRESS = EthAddress.fromString("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266")

let sdk: AztecSdk,
    aztecWalletProvider: VanillaAztecWalletProvider,
    alias,
    keystore: KeyStore,
    accountPublicKey: GrumpkinAddress,
    ethWalletProvider: WalletProvider;

async function setup() {

    const ethereumProvider = new JsonRpcProvider(ETHEREUM_HOST);
    ethWalletProvider = new WalletProvider(ethereumProvider);
    ethWalletProvider.addAccountsFromMnemonic(mnemonic, 5);

    sdk = await createAztecSdk(ethWalletProvider, {
        serverUrl: ROLLUP_HOST,
        memoryDb: true,
        minConfirmation: 1,
        debug: 'bb:*',
    });
    await sdk.run();
    await sdk.awaitSynchronised();

    keystore = sdk.createLegacyKeyStore(ADDRESS as EthAddress);
    aztecWalletProvider = await sdk.createAztecWalletProvider(keystore);
    await aztecWalletProvider.connect()

    accountPublicKey = await sdk.addAccount(aztecWalletProvider);

    let newPermissions: Permission[] = [{ assets: [0] }, { assets: [1] }]
    await aztecWalletProvider.setPermissions(newPermissions)
    let updatedPermissions = await aztecWalletProvider.getPermissions();

    updatedPermissions.map((p) => {
        p.assets.map((a) => {
            console.log("asset", a)
        })
    })

    // console.log(ethWalletProvider.getAccount(0))
}

async function register() {
    let assetId = 0;
    alias = randomBytes(8).toString('hex');
    const depositValue = sdk.toBaseUnits(assetId, '0.005');
    const fee = (await sdk.getRegisterFees(assetId))[TxSettlementTime.INSTANT];

    const controller = sdk.createRegisterController(
        await aztecWalletProvider.getAccountPublicKey(),
        alias,
        await aztecWalletProvider.getSpendingPublicKey(),
        undefined, // no recovery key
        depositValue,
        fee,
        ethWalletProvider.getAccount(0) as any,
    );

    if ((await controller.getPendingFunds()) < depositValue.value) {
        await controller.depositFundsToContract();
        await controller.awaitDepositFundsToContract();
    }

    await controller.createProofs();
    await controller.sign();
    await controller.send();
    // await controller.awaitSettlement();
    let txIds = controller.getTxIds();

    txIds.map((txId) => {
        console.log(txId)
    })
    await sdk.destroy();

}

async function deposit() {
    const assetId = 0;
    const depositValue = sdk.toBaseUnits(assetId, '0.1');
    const fee = (await sdk.getDepositFees(assetId))[TxSettlementTime.INSTANT];

    const controller = sdk.createDepositController(
        ethWalletProvider.getAccount(0) as any, 
        depositValue, 
        fee, 
        accountPublicKey,
        false // send to unregistered account
        );
    await controller.createProofs();

    if ((await controller.getPendingFunds()) < depositValue.value) {
        await controller.depositFundsToContract();
        await controller.awaitDepositFundsToContract();
    }

    await controller.sign();
    await controller.send();
    await sdk.destroy();
}

async function withdraw() {
    const assetId = 0;
    const withdrawValue = sdk.toBaseUnits(assetId, '0.03');
    const fee = (await sdk.getWithdrawFees(assetId))[TxSettlementTime.INSTANT];

    let options: ProofRequestOptions = {
        excludedNullifiers: undefined, // when would this be used?
        excludePendingNotes: true, // when would this false?
        useAccountKey: true,  // create the signer from the account key
        allowChain: true,     // allow notes to be chained
        hideNoteCreator: true // hide the sender of the transaction
    }

    const controller = sdk.createWithdrawController(
        accountPublicKey,
        withdrawValue,
        fee,
        ethWalletProvider.getAccount(0) as any,
        options
    )

    await controller.createProofs();
    await controller.send();
    await sdk.destroy();
}

async function run() {
    await setup();
    // await register();
    // await deposit();
     await withdraw();
}

run();