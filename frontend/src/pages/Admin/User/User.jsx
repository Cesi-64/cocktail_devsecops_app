import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom'
import { userService } from '@services';

const User = () => {
    const [users, setUsers] = useState([])
    const [error, setError] = useState(false)

    // Récupération de la liste des utilisateurs à l'affichage
    useEffect(() => {
        userService.getAllUsers()
            .then(res => {
                // Liste dans le state
                setUsers(res.data.data)
            })
            .catch(err => {
                console.log(err)
                setError(true)
            })
    }, [])

    // Gestion du bouton de suppression d'un utilisateur
    const delUser = (userId) => {
        setError(false)
        userService.deleteUser(userId)
            .then(res => {
                // Mise à jour du state pour affichage
                setUsers((current) => current.filter(user => user.id !== userId))
            })
            .catch(err => {
                console.log(err)
                setError(true)
            })
    }

    return (
        <div className="User">
            User liste
            <table>
                <thead>
                    <tr>
                        <th></th>
                        <th>#</th>
                        <th>Nom</th>
                        <th>Prénom</th>
                        <th>Email</th>
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
                        users.map(user => (
                            <tr key={user.id}>
                                <td><span className='del_ubtn' onClick={() => delUser(user.id)}>X</span></td>
                                <td><Link to={`/admin/user/edit/${user.id}`}>{user.id}</Link></td>
                                <td>{user.nom}</td>
                                <td>{user.prenom}</td>
                                <td>{user.email}</td>
                                <td>{user.createdAt}</td>
                            </tr>
                        ))
                    }
                </tbody>
            </table>
        </div>
    );
};

export default User;