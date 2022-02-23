import type { RenderFragmentsContextType } from '@masknet/typed-message/dom'
import { memo } from 'react'
import { Link } from '@mui/material'
import { useTagEnhancer } from '../../../../shared-ui/TypedMessageRender/Components/Text'

function Hash(props: RenderFragmentsContextType.HashLinkProps | RenderFragmentsContextType.CashLinkProps) {
    const text = props.children.slice(1)
    const target = `/hashtag/${encodeURIComponent(text)}`
    const { hasMatch, ...events } = useTagEnhancer('hash', text)
    return <Link {...events} href={target} children={props.children} />
}
export const FacebookRenderFragments: RenderFragmentsContextType = {
    // AtLink: not supported
    HashLink: memo(Hash),
    // Facebook has no native cashtag support. Treat it has a hash.
    CashLink: memo(Hash),
}
