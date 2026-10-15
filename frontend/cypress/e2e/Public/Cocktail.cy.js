/// <reference types="cypress" />

describe('COCKTAIL PAGE TEST', () => {
 

  it('Should display Cocktail inofrmation', () => {
    const mockCocktail = {
      id: '1',
      nom: 'Mojito',
      description: 'Un délicieux cocktail rafraîchissant.',
      recette: 'Mélanger le rhum, le sucre, le jus de citron vert et la menthe. Ajouter de l\'eau gazeuse et de la glace.',
    }

    cy.intercept('GET', `**/cocktails/${mockCocktail.id}`, {
      statusCode: 200,
      body: { data: mockCocktail }
    }).as('getOneCocktail')

    cy.visit(`http://localhost:5173/cocktail/${mockCocktail.id}`)

    cy.wait('@getOneCocktail').then((interception) => {
      expect(interception.request.url).to.include(`/cocktails/${mockCocktail.id}`)
    })

    cy.get('img').should('have.attr', 'src').and('include', `https://picsum.photos/1200/800?random=${mockCocktail.id}`)
    cy.get('img').should('have.attr', 'alt', mockCocktail.nom)

    cy.contains(mockCocktail.nom).should('be.visible')
    cy.contains(mockCocktail.description).should('be.visible')
    cy.contains(mockCocktail.recette).should('be.visible')
    
  })

  it('Should handles API Error', () => {
    cy.intercept('GET', '**/cocktails/1', {forceNetworkError: true}).as('failed')
    
    cy.visit(`http://localhost:5173/cocktail/1`)

    
    cy.wait('@failed').then(intercept => {
      cy.getDataCy('error-message').should('be.visible')
    }) 
   

  })
})