import { sha3, toHex } from 'web3-utils'
import type { Transaction, TransactionReceipt } from 'web3-core'
import { unreachable } from '@dimensiondev/kit'
import type { TransactionState } from '../hooks'
import { EthereumTransactionConfig, TransactionStateType, TransactionStatusType } from '../types'
import { getReceiptStatus } from './payload'

export function isEIP1559Transaction(receipt: EthereumTransactionConfig) {
    return typeof receipt.maxFeePerGas !== 'undefined' && typeof receipt.maxPriorityFeePerGas !== 'undefined'
}

export function isFinalState(type: TransactionStateType) {
    return [TransactionStateType.CONFIRMED, TransactionStateType.FAILED].includes(type)
}

/**
 * UNKNOWN -> WAIT_FOR_CONFIRMING
 * UNKNOWN, WAIT_FOR_CONFIRMING -> HASH
 * UNKNOWN, WAIT_FOR_CONFIRMING, HASH -> RECEIPT
 * WAIT_FOR_CONFIRMING, HASH, RECEIPT -> CONFIRMED
 * UNKNOWN, WAIT_FOR_CONFIRMING, HASH, RECEIPT -> FAILED
 */
export function isNextStateAvailable(type: TransactionStateType, nextType: TransactionStateType) {
    switch (nextType) {
        case TransactionStateType.UNKNOWN:
            return false
        case TransactionStateType.WAIT_FOR_CONFIRMING:
            return [TransactionStateType.UNKNOWN].includes(type)
        case TransactionStateType.HASH:
            return [TransactionStateType.UNKNOWN, TransactionStateType.WAIT_FOR_CONFIRMING].includes(type)
        case TransactionStateType.RECEIPT:
            return [
                TransactionStateType.UNKNOWN,
                TransactionStateType.WAIT_FOR_CONFIRMING,
                TransactionStateType.HASH,
            ].includes(type)
        case TransactionStateType.CONFIRMED:
            return [
                TransactionStateType.WAIT_FOR_CONFIRMING,
                TransactionStateType.HASH,
                TransactionStateType.RECEIPT,
            ].includes(type)
        case TransactionStateType.FAILED:
            return [
                TransactionStateType.UNKNOWN,
                TransactionStateType.WAIT_FOR_CONFIRMING,
                TransactionStateType.HASH,
                TransactionStateType.RECEIPT,
            ].includes(type)
        default:
            unreachable(nextType)
    }
}

export function getTransactionSignaure(transaction: Transaction | null) {
    if (!transaction) return
    const { from, to, input, value } = transaction
    return sha3([from, to, input || '0x0', toHex(value || '0x0') || '0x0'].join('_')) ?? undefined
}

export function getTransactionState(receipt: TransactionReceipt): TransactionState {
    if (receipt.blockNumber) {
        const status = getReceiptStatus(receipt)
        switch (status) {
            case TransactionStatusType.SUCCEED:
                return {
                    type: TransactionStateType.CONFIRMED,
                    no: 0,
                    receipt,
                }
            case TransactionStatusType.FAILED:
                return {
                    type: TransactionStateType.FAILED,
                    receipt,
                    error: new Error('FAILED'),
                }
            case TransactionStatusType.NOT_DEPEND:
                return {
                    type: TransactionStateType.FAILED,
                    receipt,
                    error: new Error('Invalid transaction status.'),
                }
            case TransactionStatusType.CANCELLED:
                return {
                    type: TransactionStateType.FAILED,
                    receipt,
                    error: new Error('CANCELLED'),
                }
            default:
                unreachable(status)
        }
    }
    return {
        type: TransactionStateType.RECEIPT,
        receipt,
    }
}
