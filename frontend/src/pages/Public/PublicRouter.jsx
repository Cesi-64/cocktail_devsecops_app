import React from 'react'
import { Routes, Route } from 'react-router-dom'

import { Layout, Home, Cocktail } from '@pages/Public'
import Error from '@utils/Error'

const PublicRouter = () => {
    return (
        <Routes>
            <Route element={<Layout/>}>
                <Route index element={<Home/>}/>

                <Route path="home" element={<Home/>}/>
                <Route path="cocktail/:cid" element={<Cocktail/>}/>

                <Route path="*" element={<Error/>}/>
            </Route>
        </Routes>
    )
};

export default PublicRouter;