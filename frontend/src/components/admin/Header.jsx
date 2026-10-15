import React from 'react';
import { useNavigate } from 'react-router-dom';
import { accountService } from '@services';

const Header = () => {
    let navigate = useNavigate()

    // Gestion du bouton de déconnexion
    const logout = () => {
        accountService.logout()
        navigate('/')
    }

    return (
        <div className="AHeader" data-cy="admin-header">
            Header Admin
            <button onClick={logout} data-cy="admin-logout">Logout</button>
        </div>
    );
};

export default Header;