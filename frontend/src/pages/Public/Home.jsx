import React, { useState, useEffect } from 'react';
import { cocktailService } from '@services'
import Card from '@components/public/Card';

const Home = () => {
    const [cocktails, setCocktails] = useState([])
    const [error, setError] = useState(false)

    useEffect(() => {
        cocktailService.getAllCocktails()
            .then(res => setCocktails(res.data.data))
            .catch(err => {
                setError(true)
                console.log(err)
            })

    }, [])

    return (
        <div className='home' data-cy="home-page">
            <p>Liste des Cocktails {import.meta.env.MODE}</p>
            {
                error && (
                    <p className='error' data-cy="error-message">Une Erreur est survenue</p>
                )
            }
            {
                cocktails.map((ckt, id) => (
                    <Card key={id} marcel={ckt} image='https://picsum.photos/1200/800?random=' />
                ))
            }
        </div>
    );
};

export default Home;