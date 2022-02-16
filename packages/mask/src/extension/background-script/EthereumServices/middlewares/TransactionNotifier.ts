import { Transaction } from 'web3-core'
import { TransactionReceipt } from '@ethersproject/providers'
import { WalletMessages } from '@masknet/plugin-wallet'
import { EthereumMethodType, TransactionStateType } from '@masknet/web3-shared-evm'
import { notifyProgress } from '../../../../plugins/Wallet/services'
import { getTransactionState } from '../../../../plugins/Wallet/services/transaction/helpers'
import type { Context, Middleware } from '../types'

export class TransactionNotifier implements Middleware<Context> {
    async fn(context: Context, next: () => Promise<void>) {
        await next()

        switch (context.method) {
            case EthereumMethodType.ETH_GET_TRANSACTION_BY_HASH:
                {
                    const transaction = context.result as Transaction | undefined

                    if (transaction?.hash) {
                        notifyProgress(transaction, {
                            type: TransactionStateType.HASH,
                            hash: transaction.hash,
                        })
                    }
                }
                break

            case EthereumMethodType.ETH_GET_TRANSACTION_RECEIPT:
                const receipt = context.result as TransactionReceipt | undefined
                const transaction = receipt as unknown as Transaction
                if (receipt.transactionHash) {
                    const state = getTransactionState(receipt)
                    notifyProgress(transaction, state)
                    WalletMessages.events.transactionStateUpdated.sendToAll(state)
                }
                break
        }
    }
}
