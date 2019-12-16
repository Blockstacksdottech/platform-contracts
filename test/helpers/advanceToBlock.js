export async function advanceBlock() {
    await web3.currentProvider.send({
        jsonrpc: '2.0',
        method: 'evm_mine',
        id: Date.now(),
    })
}

// Advances the block number so that the last mined block is `number`.
export default async function advanceToBlock(number) {
    if (web3.eth.blockNumber > number) {
        throw Error(`block number ${number} is in the past (current is ${web3.eth.blockNumber})`)
    }

    while (web3.eth.blockNumber < number) {
        await advanceBlock()
    }
}