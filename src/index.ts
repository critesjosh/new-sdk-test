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
    VanillaAztecWalletProvider
} from '@aztec/sdk';


const ETHEREUM_HOST = 'http://localhost:8545',
    ROLLUP_HOST = 'http://localhost:8081',
    mnemonic = "test test test test test test test test test test test junk",
    ADDRESS = EthAddress.fromString("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266")

let sdk: AztecSdk,
    aztecWalletProvider: VanillaAztecWalletProvider,
    alias,
    keystore: KeyStore,
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

    await sdk.addAccount(aztecWalletProvider);

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
        //@ts-ignore
        ethWalletProvider.getAccount(0),
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

    txIds.map((txId)=> {
        console.log(txId)
    })
}

async function run() {
    await setup();
    await register();
}

run();