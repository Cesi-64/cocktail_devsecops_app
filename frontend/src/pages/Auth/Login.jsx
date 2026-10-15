import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { accountService } from '@services';

import './auth.css'

const Login = () => {
    const [error, setError] = useState(false)
    let navigate = useNavigate()

    // Attention ici mise en place de valeur par défaut pour travailler.
    // NE JAMAIS FAIRE CELA
    const [credentials, setCredentials] = useState({
        email: 'admin@admin.admin',
        password: 'nimdaghjghgj'
    })
    
    // Gestion de la modification des champs du formulaire
    const onChange = (e) => {
        setCredentials({
            ...credentials,
            [e.target.name]: e.target.value
        })
    }

    // Soumission du formulaire
    const onSubmit = (e) => {
        e.preventDefault()
        accountService.login(credentials)
            .then(res => {
                //Sauvegarde du token et envoi vers admin
                accountService.saveToken(res.data.access_token)
                navigate('/admin', {replace: true})
            })
            .catch(error => {
                console.log(error)
                setError(true)
            })
    }
    
    return (
        <form onSubmit={onSubmit}>
            <div className="group">
                <label htmlFor="email">Identifiant</label>
                <input type="text" name="email" data-cy="email"  value={credentials.email} onChange={onChange}/>
            </div>
            <div className="group">
                <label htmlFor="password">Mot de passe</label>
                <input type="text" name="password" data-cy="password" value={credentials.password} onChange={onChange}/>
            </div>
            <div className="group">
                <button data-cy="admin-login">Connexion</button>
            </div>
            {
                error && (
                    <p className='error' data-cy="error-message">Erreur de login ou Mot de passe</p>
                )
            }
        </form>
    );
};

export default Login;