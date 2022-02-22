import type { Transaction, TransactionReceipt } from 'web3-core'
import type { JsonRpcPayload } from 'web3-core-helpers'
import { WalletMessages } from '@masknet/plugin-wallet'
import {
    EthereumMethodType,
    getPayloadSignature,
    getTransactionSignaure,
    getTransactionState,
    isFinalState,
    isNextStateAvailable,
    ProviderType,
    TransactionState,
    TransactionStateType,
} from '@masknet/web3-shared-evm'
import type { Context, Middleware } from '../types'

interface TransactionProgress {
    state: TransactionState
    payload: JsonRpcPayload
}

export class TransactionNotifier implements Middleware<Context> {
    private watched: Map<string, TransactionProgress> = new Map()

    private addProgress({ state, payload }: TransactionProgress) {
        const progressId = getPayloadSignature(payload)
        if (!progressId) return
        if (this.watched.has(progressId)) return

        this.watched.set(progressId, {
            payload,
            state,
        })
        this.updateProgressState(progressId, state)
    }

    private removeProgress(progressId: string) {
        this.watched.delete(progressId)
    }

    private updateProgressState(progressId: string, state: TransactionState) {
        const progress = this.watched.get(progressId)
        if (!progress) return

        progress.state = state
        WalletMessages.events.transactionProgressUpdated.sendToAll(progress)

        // stop watch progress
        if (isFinalState(progress.state.type)) this.removeProgress(progressId)
    }

    private notifyProgress(progressId: string, state: TransactionState) {
        const progress = this.watched.get(progressId)
        if (!progress) return
        if (isNextStateAvailable(progress.state.type, state.type)) this.updateProgressState(progressId, state)
    }

    private notifyPayloadProgress(payload: JsonRpcPayload, state: TransactionState) {
        const progressId = getPayloadSignature(payload)
        this.notifyProgress(progressId, state)
    }

    private notifyTransactionProgress(transaction: Transaction, state: TransactionState) {
        const progressId = getTransactionSignaure(transaction)
        this.notifyProgress(progressId, state)
    }

    async fn(context: Context, next: () => Promise<void>) {
        await next()

        switch (context.method) {
            case EthereumMethodType.ETH_SEND_TRANSACTION:
                this.addProgress({
                    state: {
                        type:
                            context.providerType === ProviderType.MaskWallet
                                ? TransactionStateType.UNKNOWN
                                : TransactionStateType.WAIT_FOR_CONFIRMING,
                    },
                    payload: context.request,
                })
                break
            case EthereumMethodType.ETH_GET_TRANSACTION_BY_HASH:
                {
                    const transaction = context.result as Transaction | undefined
                    if (transaction?.hash) {
                        this.notifyProgress(getTransactionSignaure(transaction), {
                            type: TransactionStateType.HASH,
                            hash: transaction.hash,
                        })
                    }
                }
                break
            case EthereumMethodType.ETH_GET_TRANSACTION_RECEIPT:
                const receipt = context.result as TransactionReceipt | undefined
                const transaction = receipt as unknown as Transaction
                if (receipt?.transactionHash) {
                    const state = getTransactionState(receipt)
                    this.notifyProgress(getTransactionSignaure(transaction), state)
                    WalletMessages.events.transactionStateUpdated.sendToAll(state)
                }
                break
        }
    }
}
