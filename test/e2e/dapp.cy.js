describe('Load Demo dApp', () => {
  it('successfully loads', () => {
    cy.visit('test/e2e/test_dApp.html');
    cy.get('#address').contains('bZqy8Big6pWTDeFTHz2Z6KLmuniqwRNXMT');
  });
});
