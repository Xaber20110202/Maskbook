import { memo } from 'react'
import { Box, makeStyles, Paper, withStyles } from '@material-ui/core'
import { MiniMaskIcon } from '@masknet/icons'
import { NavLink } from 'react-router-dom'
import { DialogRoutes } from '../../index'
import { useI18N } from '../../../../utils'
import { useMyPersonas } from '../../../../components/DataSource/useMyPersonas'
import { InitialPlaceholder } from '../InitialPlaceholder'

const GlobalCss = withStyles({
    '@global': {
        body: {
            overflowX: 'hidden',
            margin: '0 auto',
            width: 310,
            maxWidth: '100%',
            backgroundColor: 'transparent',
            '&::-webkit-scrollbar': {
                display: 'none',
            },
        },
    },
})(() => null)

const useStyles = makeStyles((theme) => ({
    container: {
        minHeight: 380,
        display: 'flex',
        flexDirection: 'column',
    },
    header: {
        padding: '0px 10px',
        backgroundColor: theme.palette.primary.main,
        height: 40,
        display: 'flex',
        justifyContent: 'space-between',
    },
    left: {
        display: 'flex',
        alignItems: 'center',
    },
    right: {
        display: 'flex',
        paddingTop: 6,
    },
    nav: {
        width: 86,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'transparent',
        borderRadius: '4px 4px 0px 0px',
        fontSize: 14,
        fontWeight: 500,
        color: theme.palette.primary.contrastText,
        textDecoration: 'none',
    },
    active: {
        color: theme.palette.primary.main,
        cursor: 'inherit',
        backgroundColor: '#ffffff',
    },
}))

export interface PopupFrameProps extends React.PropsWithChildren<{}> {}

export const PopupFrame = memo<PopupFrameProps>((props) => {
    const { t } = useI18N()
    const classes = useStyles()
    const personas = useMyPersonas()
    return (
        <>
            <GlobalCss />
            <Paper elevation={0}>
                <Box className={classes.header}>
                    <Box className={classes.left}>
                        <MiniMaskIcon />
                    </Box>
                    <Box className={classes.right}>
                        <NavLink
                            style={{ marginRight: 5 }}
                            to={DialogRoutes.Wallet}
                            className={classes.nav}
                            activeClassName={classes.active}>
                            {t('wallets')}
                        </NavLink>
                        <NavLink to={DialogRoutes.Personas} className={classes.nav} activeClassName={classes.active}>
                            {t('personas')}
                        </NavLink>
                    </Box>
                </Box>
                <Box className={classes.container}>
                    {personas.length === 0 ? <InitialPlaceholder /> : props.children}
                </Box>
            </Paper>
        </>
    )
})
