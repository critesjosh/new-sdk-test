import { AztecSdk, createAztecSdk, EthAddress, GrumpkinAddress, JsonRpcProvider, KeyStore, VanillaAztecWalletProvider, WalletProvider } from "@aztec/sdk";
import { MultiSigAccount, MultiSigServer, MultiSigKeyStore } from "./multisigHelpers.js";

const ETHEREUM_HOST = 'http://localhost:8545',
    ROLLUP_HOST = 'http://localhost:8081',
    mnemonic = "test test test test test test test test test test test junk",
    ADDRESS = EthAddress.fromString("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266")

let sdk: AztecSdk,
    aztecWalletProvider: VanillaAztecWalletProvider,
    alias: string,
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

    const server = new MultiSigServer(sdk);
    
    // get Aztec keystores for 2 accounts
    const keystore0 = sdk.createLegacyKeyStore(ethWalletProvider.getAccount(0))
    const keystore1 = sdk.createLegacyKeyStore(ethWalletProvider.getAccount(1))

    // add two accounts to the multisig
    // note i am adding ETH private keys, not aztec keys
    const multiSigPubKey0 = server.createAccount(ethWalletProvider.getPrivateKey(0));
    const multiSigPubKey1 = server.createAccount(ethWalletProvider.getPrivateKey(1));

    // create account keys for the multisig
    const accountKey = sdk.createRandomKeyPair();
    const multiSigPubKeys = [multiSigPubKey0, multiSigPubKey1];

    // create the multisig keystore
    const keyStore = new MultiSigKeyStore(accountKey, multiSigPubKeys, server, sdk);
    const aztecWalletProvider = await sdk.createAztecWalletProvider(keyStore);
    await aztecWalletProvider.connect();
    // add the multisig to the sdk
    await sdk.addAccount(aztecWalletProvider);
}

async function register(){
    const accountPublicKey = await aztecWalletProvider.getAccountPublicKey();
    const spendingPublicKey = await aztecWalletProvider.getSpendingPublicKey();
}