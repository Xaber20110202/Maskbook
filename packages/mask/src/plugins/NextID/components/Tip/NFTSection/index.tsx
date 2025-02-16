import { makeStyles } from '@masknet/theme'
import { ERC721TokenDetailed, useAccount, useERC721TokenDetailedCallback } from '@masknet/web3-shared-evm'
import { useERC721TokenDetailedOwnerList } from '@masknet/web3-providers'
import { Button, FormControl, Typography } from '@mui/material'
import classnames from 'classnames'
import { FC, HTMLProps, useCallback, useMemo, useState } from 'react'
import { SearchInput } from '../../../../../extension/options-page/DashboardComponents/SearchInput'
import { ERC721ContractSelectPanel } from '../../../../../web3/UI/ERC721ContractSelectPanel'
import { TargetChainIdContext, useTip } from '../../../contexts'
import { NFTList } from './NFTList'
import { useI18N } from '../../../locales'

export * from './NFTList'

const useStyles = makeStyles()((theme) => ({
    root: {
        display: 'flex',
        flexDirection: 'column',
        overflow: 'auto',
    },
    selectSection: {
        marginTop: theme.spacing(1.5),
        display: 'flex',
        flexDirection: 'column',
        overflow: 'auto',
    },
    list: {
        flexGrow: 1,
        marginTop: theme.spacing(2),
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        maxHeight: 400,
        overflow: 'auto',
        gridGap: 18,
        backgroundColor: theme.palette.background.default,
        borderRadius: 4,
        padding: theme.spacing(1),
    },
    keyword: {
        borderRadius: 8,
        marginRight: theme.spacing(1.5),
    },
    searchButton: {
        borderRadius: 8,
        width: 100,
    },
    row: {
        display: 'flex',
        flexDirection: 'row',
    },
    errorMessage: {
        marginTop: theme.spacing(3),
        fontSize: 12,
        color: theme.palette.error.main,
        marginBottom: theme.spacing(3),
    },
}))

interface Props extends HTMLProps<HTMLDivElement> {}

export const NFTSection: FC<Props> = ({ className, ...rest }) => {
    const t = useI18N()
    const { targetChainId: chainId } = TargetChainIdContext.useContainer()
    const { erc721Contract, setErc721Contract, erc721TokenId, setErc721TokenId, isSending } = useTip()
    const [tokenId, setTokenId, erc721TokenDetailedCallback] = useERC721TokenDetailedCallback(erc721Contract)
    const { classes } = useStyles()
    const account = useAccount()
    const { tokenDetailedOwnerList: myTokens = [] } = useERC721TokenDetailedOwnerList(erc721Contract, account)

    const selectedIds = useMemo(() => (erc721TokenId ? [erc721TokenId] : []), [erc721TokenId])

    const [searchedToken, setSearchedToken] = useState<ERC721TokenDetailed | null>(null)
    const onSearch = useCallback(async () => {
        const token = await erc721TokenDetailedCallback()
        setSearchedToken(token?.info.owner ? token : null)
    }, [erc721TokenDetailedCallback])

    const tokens = useMemo(() => (searchedToken ? [searchedToken] : myTokens), [searchedToken, myTokens])
    const enableTokenIds = useMemo(() => myTokens.map((t) => t.tokenId), [myTokens])

    return (
        <div className={classnames(classes.root, className)} {...rest}>
            <FormControl>
                <ERC721ContractSelectPanel
                    chainId={chainId}
                    label={t.tip_contracts()}
                    contract={erc721Contract}
                    onContractChange={setErc721Contract}
                />
            </FormControl>
            {erc721Contract ? (
                <div className={classes.selectSection}>
                    <FormControl className={classes.row}>
                        <SearchInput
                            classes={{ root: classes.keyword }}
                            value={tokenId}
                            onChange={(id) => setTokenId(id)}
                            inputBaseProps={{
                                disabled: isSending,
                            }}
                            label=""
                        />
                        <Button
                            className={classes.searchButton}
                            variant="contained"
                            disabled={isSending}
                            onClick={onSearch}>
                            {t.search()}
                        </Button>
                    </FormControl>
                    <NFTList
                        className={classes.list}
                        selectedIds={selectedIds}
                        tokens={tokens}
                        enableTokenIds={enableTokenIds}
                        onChange={(ids) => {
                            setErc721TokenId(ids.length ? ids[0] : null)
                        }}
                    />
                </div>
            ) : null}
            {tokens.length === 1 && !enableTokenIds.includes(tokens[0].tokenId) ? (
                <Typography variant="body1" className={classes.errorMessage}>
                    {t.nft_not_belong_to_you()}
                </Typography>
            ) : null}
        </div>
    )
}
