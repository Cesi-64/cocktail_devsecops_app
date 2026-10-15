import React, { useEffect, useState } from 'react';

import { cocktailService } from '@services/cocktail.service';
import { useParams } from 'react-router-dom';

const Cocktail = () => {
    const [cocktail, setCocktail] = useState({})
    const [error, setError] = useState(false)
    let { cid } = useParams()

    // Récupération du cocktail depuis l'API
    useEffect(() => {
        cocktailService.getCocktail(cid)
            .then(res => setCocktail(res.data.data))
            .catch(err => {
                console.log(err)
                setError(true)
            })
        // eslint-disable-next-line
    }, [])

    return (
        <div className='service'>
            {
                error ? (
                    <p className='error' data-cy="error-message">Une Erreur est survenue</p>
                ) : (
                    <>
                        <img src={'https://picsum.photos/1200/800?random=' + cocktail.id} alt={cocktail.nom} />
                        <div>{cocktail.nom}</div>
                        <div>{cocktail.description}</div>
                        <div>{cocktail.recette}</div>
                    </>
                )
            }

        </div>
    );
};

export default Cocktail;