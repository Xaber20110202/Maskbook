import { MutationObserverWatcher } from '@dimensiondev/holoflows-kit'
import { searchInstagramAvatarSelector, searchInstagramAvatarUploadLoadingSelector } from '../../utils/selector'
import { createReactRootShadowed, startWatch } from '../../../../utils'
import { makeStyles } from '@masknet/theme'
import { useWallet } from '@masknet/plugin-infra'
import { useEffect, useMemo, useState } from 'react'
import type { AvatarMetaDB } from '../../../../plugins/Avatar/types'
import { useCurrentVisitingIdentity } from '../../../../components/DataSource/useActivatedUI'
import { useNFTAvatar } from '../../../../plugins/Avatar/hooks'
import { RSS3_KEY_SNS } from '../../../../plugins/Avatar/constants'
import { InMemoryStorages } from '../../../../../shared'
import { clearStorages, getAvatarId } from '../../utils/user'
import { PluginNFTAvatarRPC } from '../../../../plugins/Avatar/messages'
import { useLocation, useWindowSize } from 'react-use'
import { NFTBadge } from '../../../../plugins/Avatar/SNSAdaptor/NFTBadge'

export function injectNFTAvatarInInstagram(signal: AbortSignal) {
    const watcher = new MutationObserverWatcher(searchInstagramAvatarSelector())
    startWatch(watcher, signal)
    createReactRootShadowed(watcher.firstDOMProxy.afterShadow, { signal }).render(<NFTAvatarInInstagram />)
}

const useStyles = makeStyles()(() => ({
    root: {
        position: 'absolute',
        textAlign: 'center',
        color: 'white',
        width: '100%',
        height: '100%',
        top: 0,
        left: 0,
    },
    text: {
        fontSize: '20px !important',
        fontWeight: 700,
    },
    icon: {
        width: '19px !important',
        height: '19px !important',
    },
}))

function NFTAvatarInInstagram() {
    const { classes } = useStyles()
    const wallet = useWallet()
    const [avatar, setAvatar] = useState<AvatarMetaDB>()
    const identity = useCurrentVisitingIdentity()
    const location = useLocation()
    const { value: _avatar } = useNFTAvatar(identity.identifier.userId, RSS3_KEY_SNS.INSTAGRAM)
    const windowSize = useWindowSize()

    const showAvatar = useMemo(() => {
        return getAvatarId(identity.avatar ?? '') === avatar?.avatarId
    }, [avatar?.avatarId, identity.avatar])

    const size = useMemo(() => {
        const ele = searchInstagramAvatarSelector().evaluate()

        if (!ele) return 0

        const style = window.getComputedStyle(ele)
        return Number.parseInt(style.width.replace('px', '') ?? 0, 10)
    }, [windowSize])

    useEffect(() => {
        if (!searchInstagramAvatarUploadLoadingSelector()) return
        const watcher = new MutationObserverWatcher(searchInstagramAvatarUploadLoadingSelector())
            .addListener('onRemove', async () => {
                const storages = InMemoryStorages.InstagramNFTEvent.storage

                if (!wallet || !location.href) return
                if (storages.address.value && storages.userId.value && storages.tokenId.value) {
                    try {
                        const response = await fetch(location.href)
                        const htmlString = await response.text()

                        const html = document.createElement('html')
                        html.innerHTML = htmlString

                        const metaTag = html.querySelector<HTMLMetaElement>('meta[property="og:image"]')

                        if (!metaTag?.content) return

                        const avatarInfo = await PluginNFTAvatarRPC.saveNFTAvatar(
                            wallet.address,
                            {
                                userId: storages.userId.value,
                                tokenId: storages.tokenId.value,
                                address: storages.address.value,
                                avatarId: getAvatarId(metaTag.content),
                            } as AvatarMetaDB,
                            identity.identifier.network,
                            RSS3_KEY_SNS.INSTAGRAM,
                        )

                        if (!avatarInfo) {
                            clearStorages()
                            setAvatar(undefined)
                            window.alert('Sorry, failed to save NFT Avatar. Please set again.')
                            return
                        }

                        setAvatar(avatarInfo)
                        clearStorages()
                    } catch (error: any) {
                        clearStorages()
                        setAvatar(undefined)
                        window.alert(error.message)
                        return
                    }
                }
            })
            .startWatch({
                childList: true,
                subtree: true,
                attributes: true,
            })

        return () => {
            watcher.stopWatch()
        }
    }, [identity])

    useEffect(() => setAvatar(_avatar), [_avatar, location])

    if (!avatar || !size || !showAvatar) return null

    return (
        <NFTBadge
            avatar={avatar}
            size={size}
            classes={{ root: classes.root, text: classes.text, icon: classes.icon }}
        />
    )
}
