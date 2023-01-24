import { createAztecSdk, EthAddress, WalletProvider, JsonRpcProvider, } from '@aztec/sdk';
const { ETHEREUM_HOST = 'http://localhost:8545', ROLLUP_HOST = 'http://localhost:8081', PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', ADDRESS = EthAddress.fromString("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"), } = process.env;
let sdk;
async function go() {
    const ethereumProvider = new JsonRpcProvider(ETHEREUM_HOST);
    const walletProvider = new WalletProvider(ethereumProvider);
    walletProvider.addAccount(Buffer.from("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", "hex"));
    sdk = await createAztecSdk(walletProvider, {
        serverUrl: ROLLUP_HOST,
        memoryDb: true,
        minConfirmation: 1,
        debug: 'bb:*',
    });
    await sdk.run();
    await sdk.awaitSynchronised();
    const keyStore = sdk.createLegacyKeyStore(ADDRESS);
    await sdk.createAztecWalletProvider(keyStore);
}
