import type { TransactionReceipt } from 'web3-core'
import type { JsonRpcPayload } from 'web3-core-helpers'
import { ChainId, getPayloadConfig, getReceiptStatus, TransactionStatusType } from '@masknet/web3-shared-evm'
import {
    getSendTransactionComputedPayload,
    getTransactionReceipt,
    watchTransaction,
    unwatchTransaction,
} from '../../../../extension/background-script/EthereumService'
import * as database from './database'

export interface RecentTransactionOptions {
    status?: TransactionStatusType
    receipt?: boolean
    computedPayload?: boolean
}

export interface RecentTransaction {
    at: Date
    hash: string
    payload: JsonRpcPayload
    status: TransactionStatusType
    receipt?: TransactionReceipt | null
    replacements?: Record<string, JsonRpcPayload>
    computedPayload?: UnboxPromise<ReturnType<typeof getSendTransactionComputedPayload>>
}

export async function addRecentTransaction(chainId: ChainId, address: string, hash: string, payload: JsonRpcPayload) {
    await database.addRecentTransaction(chainId, address, hash, payload)
}

export async function removeRecentTransaction(chainId: ChainId, address: string, hash: string) {
    await database.removeRecentTransaction(chainId, address, hash)
}

export async function replaceRecentTransaction(
    chainId: ChainId,
    address: string,
    hash: string,
    newHash: string,
    newPayload: JsonRpcPayload,
) {
    await database.replaceRecentTransaction(chainId, address, hash, newHash, newPayload)
}

export async function clearRecentTransactions(chainId: ChainId, address: string) {
    await database.clearRecentTransactions(chainId, address)
}

export async function getRecentTransaction(
    chainId: ChainId,
    address: string,
    hash: string,
    options?: RecentTransactionOptions,
) {
    const transactions = await getRecentTransactions(chainId, address, options)
    return transactions.find((x) => x.hash === hash)
}

export async function getRecentTransactions(
    chainId: ChainId,
    address: string,
    options?: RecentTransactionOptions,
): Promise<RecentTransaction[]> {
    const transactions = await database.getRecentTransactions(chainId, address)
    const allSettled = await Promise.allSettled(
        transactions.map<Promise<RecentTransaction>>(async ({ at, hash, payload, replacements = {} }) => {
            const tx: RecentTransaction = {
                at,
                hash,
                payload,
                status: getReceiptStatus(null),
                receipt: null,
            }
            const pairs = [
                {
                    hash,
                    payload,
                },
                ...Object.entries(replacements).map(([hash, payload]) => ({ hash, payload })),
            ]

            try {
                for await (const pair of pairs) {
                    const receipt = await getTransactionReceipt(pair.hash)

                    if (!receipt) continue

                    tx.hash = pair.hash
                    tx.payload = pair.payload
                    tx.receipt = receipt
                }
            } catch {
                // do nothing
            } finally {
                if (tx.receipt) {
                    pairs.forEach((x) => {
                        if (x.hash !== tx.receipt?.transactionHash) unwatchTransaction(x.hash)
                    })
                } else {
                    const config = getPayloadConfig(tx.payload)
                    if (config) pairs.forEach((x) => watchTransaction(x.hash, config))
                }
            }

            if (options?.receipt) delete tx.receipt
            if (options?.computedPayload) {
                tx.computedPayload = await getSendTransactionComputedPayload(tx.payload)
            }

            return tx
        }),
    )

    // compose result
    const transaction_: RecentTransaction[] = []
    allSettled.forEach((x) =>
        x.status === 'fulfilled' && (typeof options?.status !== 'undefined' ? x.value.status === options?.status : true)
            ? transaction_.push(x.value)
            : undefined,
    )
    return transaction_
}
