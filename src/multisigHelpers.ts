import { AccountTx, AztecSdk, ConstantKeyStore, KeyPair, ProofInput, randomBytes } from "@aztec/sdk";

export class MultiSigAccount {
    private privateOutput!: Buffer;

    constructor(private privateKey: Buffer, private sdk: AztecSdk) { }

    public getPublicKey() {
        return this.sdk.deriveMultiSigPublicKey(this.privateKey);
    }

    public generatePublicOutput() {
        const { privateOutput, publicOutput } = this.sdk.generateMultiSigData();
        this.privateOutput = privateOutput;
        return publicOutput;
    }

    public signProofs(proofInputs: ProofInput[], publicKeys: Buffer[], publicOutputs: Buffer[]) {
        return proofInputs.map(p =>
            this.sdk.createMultiSigSignature(p.signingData, publicKeys, publicOutputs, this.privateKey, this.privateOutput),
        );
    }
}

export class MultiSigServer {
    private accounts: MultiSigAccount[] = [];

    constructor(private sdk: AztecSdk) { }

    public createAccount(privateKey: Buffer) {
        const account = new MultiSigAccount(privateKey, this.sdk);
        this.accounts.push(account);
        return account.getPublicKey();
    }

    public signProofs(proofInputs: ProofInput[], multiSigPublicKeys: Buffer[]) {
        const accounts = multiSigPublicKeys.map(
            pubKey => this.accounts.find(a => a.getPublicKey().slice(0, 64).equals(pubKey.slice(0, 64)))!,
        );
        const publicOutputs = accounts.map(a => a.generatePublicOutput());
        const accountSignatures = accounts.map(a => a.signProofs(proofInputs, multiSigPublicKeys, publicOutputs));
        return proofInputs.map(({ signingData }, proofIdx) => {
            const signatures = accounts.map((_, accountIdx) => accountSignatures[accountIdx][proofIdx]);
            return this.sdk.combineMultiSigSignatures(signingData, multiSigPublicKeys, publicOutputs, signatures)!;
        });
    }
}

export class MultiSigKeyStore extends ConstantKeyStore {
    private localSigner: KeyPair;

    constructor(
        accountKey: KeyPair,
        private multiSigPublicKeys: Buffer[],
        private server: MultiSigServer,
        private sdk: AztecSdk,
    ) {
        super(accountKey, accountKey);
        this.localSigner = accountKey;
    }

    public getSpendingPublicKey() {
        return Promise.resolve(this.sdk.combineMultiSigPublicKeys(this.multiSigPublicKeys));
    }

    public signProofs(proofInputs: ProofInput[]) {
        const useAccountKey = proofInputs.some(p => (p.tx as AccountTx).create);
        if (useAccountKey) {
            return Promise.all(proofInputs.map(p => this.localSigner.signMessage(p.signingData)));
        } else {
            return Promise.resolve(this.server.signProofs(proofInputs, this.multiSigPublicKeys));
        }
    }
}
