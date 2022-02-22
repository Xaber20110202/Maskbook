import { memo, useMemo } from 'react'
import type { TypedMessageTuple } from '../../../base'
import { hasCircular } from '../utils/circularDetect'
import { TypedMessageRender } from '../Entry'
import { useMetadataRender } from '../MetadataRender'

export const TypedMessageTupleRenderer = memo(function TypedMessageTupleRenderer(props: TypedMessageTuple) {
    const meta = useMetadataRender(props)
    if (useMemo(() => hasCircular(props.items), [props.items])) return null
    return (
        <>
            {props.items.map((message, index) => (
                <TypedMessageRender key={index} {...props} message={message} />
            ))}
            {meta}
        </>
    )
})
