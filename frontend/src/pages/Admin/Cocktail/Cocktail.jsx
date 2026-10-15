import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom'
import { cocktailService } from '@services';

const Cocktail = () => {
    const [cocktails, setCocktails] = useState([])
    const [error, setError] = useState(false)


    // Récupération de la liste des cocktails à l'affichage
    useEffect(() => {
        cocktailService.getAllCocktails()
            .then(res => {
                // Liste dans le state
                setCocktails(res.data.data)
            })
            .catch(err => {
                console.log(err)
                setError(true)
            })
    }, [])

    // Gestion du bouton de suppression
    const delCocktail = (cocktailId) => {
        cocktailService.deleteCocktail(cocktailId)
            .then(res => {
                // Mise à jour du state pour affichage
                setCocktails((current) => current.filter(cocktail => cocktail.id !== cocktailId))
            })
            .catch(err => {
                console.log(err)
                setError(true)
            })
    }

    return (
        <div className="Cocktail">
            Cocktail liste
            <table>
                <thead>
                    <tr>
                        <th></th>
                        <th>#</th>
                        <th>Nom</th>
                        <th>Description</th>
                        <th>Created</th>
                    </tr>
                </thead>
                <tbody>
                    {
                        error && (
                            <p className='error' data-cy="error-message">Une Erreur est survenue</p>
                        )
                    }
                    {
                        cocktails.map(cocktail => (
                            <tr key={cocktail.id}>
                                <td><span className='del_ubtn' onClick={() => delCocktail(cocktail.id)}>X</span></td>
                                <td><Link to={`/admin/cocktail/edit/${cocktail.id}`}>{cocktail.id}</Link></td>
                                <td>{cocktail.nom}</td>
                                <td>{cocktail.description}</td>
                                <td>{cocktail.createdAt}</td>
                            </tr>
                        ))
                    }
                </tbody>
            </table>
        </div>
    );
};

export default Cocktail;