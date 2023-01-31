# new-sdk-test
 testing the new aztec sdk

## Requirements

- Node.js version 18

## Notes on `ProofRequestOptions`

`excludePendingNotes` default is false, in this case the sdk will pick at most 1 pending note as input note. But if a user wants to be more careful, they can set it to true, and the sdk will only pick from settled notes. Because if a pending note is used in a tx, the proof will contain a backward link, which will reference to an output note in another tx, Anyone looking at the tx pool will be able to link the two txs together. This usually won’t be a problem. But it might be useful if a user suspect people can figure out the sender or something else if those txs are associated together.

`excludedNullifiers` can be set when a user wants to exclude the notes used in some txs, but those txs are not sent to the rollup provider yet. Because the sdk will only mark the notes as unavailable after the proofs containing them are sent. For example, a user can create a transfer controller and generates the `proofRequestData`. And then creates another transfer controller, excluding the input notes in the `proofRequestData` from the previous controller. They then generate the proof inputs for both controllers and send over to different users for them to sign. And after a while, use the collected signatures to create the proof outputs and send them to falafel.