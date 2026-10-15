import React from 'react';
import { Link } from 'react-router-dom'

import './card.css'

const Card = ({ marcel, image }) => {

    return (
        <Link to={`/cocktail/${marcel.id}`} className='card_link'>
            <article className='card_article'>
                <img src={image + marcel.id} alt={marcel.nom} />
                <div>{marcel.nom}</div>
            </article>
        </Link>
    );
};

export default Card;