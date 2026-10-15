// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })

// **************************************************************************************************************** //
// *************************************************** SELECTOR *************************************************** //
// **************************************************************************************************************** //


// Cypress.Commands.add("getBySel", (selector, ...args) => {
//     return cy.get(`[data-cy=${selector}]`, ...args).then(($element) => {
//       if ($element.length === 0) {
//         console.log('rien dutout')
//         throw new Error(`Element with data-cy="${selector}" not found`);
//       }else{
//         console.log('OK jai trouve')
//       }
//       console.log($element)
//       return $element; // Retourne l'élément si trouvé
//     });
//   });

// ### Attention ici il ne sera pas possible d'utiliser exist (gestion DOM cypress)
// Cypress.Commands.add("getDataCy", (selector, ...args) => {
//     return cy.get(`[data-cy=${selector}]`, ...args)
// })

// ### Solution au problème précédent + selection avec enfant
Cypress.Commands.add("getDataCy", (selector, ...args) => {
    if(/\s/.test(selector)){
        let sels = selector.split(" ")

        return cy.get(`[data-cy=${sels[0]}] ${sels[1]}`, ...args).then(element => {
            console.log(element)
            return element
        })
    }else{
        return cy.get(`[data-cy=${selector}]`, ...args).then(element => {
            return element
        })
    }    
})

// ****************************************************************************************************************** //
// *************************************************** CONNECTION *************************************************** //
// ****************************************************************************************************************** //

Cypress.Commands.add('login', (type, user) => {
    cy.getDataCy('email').clear().type(type ? user.goodEmail : user.badEmail)
    cy.getDataCy('password').clear().type(type ? user.goodPass : user.badPass)
    cy.getDataCy('admin-login').click()

    // Here just to see if is the test or the command failed when good user
    if(type){
        cy.getDataCy('admin-header').should('be.visible')
    }    
})
