import ComponentPo from '@/cypress/e2e/po/components/component.po';

export default class BurgerMenuPo extends ComponentPo {
  constructor() {
    super('[data-testid="side-menu"]');
  }

  /**
   * Toggle side navigation
   * @returns {Cypress.Chainable}
   */
  static toggle(): Cypress.Chainable {
    // added wait of 500ms to make time for CSS transitions to resolve (addresses tests flakiness)
    // unfortunately there's no "easy" (and foolproof) way of waiting for transitions and 500ms is quick and does the trick
    return cy.getId('top-level-menu').should('be.visible').click({ force: true }).wait(500); // eslint-disable-line cypress/no-unnecessary-waiting
  }

  /**
   * Navigates to a top-level side menu entry by label (non-cluster)
   * @returns {Cypress.Chainable}
   */
  static burgerMenuNavToMenubyLabel(label: string): Cypress.Chainable {
    return this.sideMenu().should('exist').find('.option').contains(label)
      .click({ force: true });
  }

  /**
   * Navigates to a cluster on a top-level side menu entry by label
   * @returns {Cypress.Chainable}
   */
  static burgerMenuNavToClusterbyLabel(label: string): Cypress.Chainable {
    return this.sideMenu().should('exist').find('.option .cluster-name').contains(label)
      .click();
  }

  /**
   * Check if cluster on a top-level side menu entry by entry index has the appropriate key combo icon
   * @returns {Cypress.Chainable}
   */
  static burgerMenuNavClusterKeyComboIconCheck(index: number): Cypress.Chainable {
    return this.sideMenu().should('exist').find(`.clustersList [data-testid="top-level-menu-cluster-${ index }"] .cluster-icon-menu i`).should('have.class', 'icon-keyboard_tab');
  }

  /**
   * Get menu navigation item by label
   * @returns {Cypress.Chainable}
   */
  static burgerMenuGetNavMenubyLabel(label: string): Cypress.Chainable {
    return this.sideMenu().find('.option').contains(label);
  }

  /**
   * Get cluster navigation item by label
   * @returns {Cypress.Chainable}
   */
  static burgerMenuGetNavClusterbyLabel(label: string): Cypress.Chainable {
    return this.sideMenu().find('.option .cluster-name').contains(label);
  }

  /**
   * Check if Cluster Top Level Menu link is highlighted
   */
  static checkIfClusterMenuLinkIsHighlighted(name: string, isHighlightedAssertion = true) {
    const assertion = isHighlightedAssertion ? 'have.class' : 'not.have.class';

    return this.burgerMenuGetNavClusterbyLabel(name).parent().parent().should(assertion, 'active-menu-link');
  }

  /**
   * Check if non-cluster Top Level Menu link is highlighted
   */
  static checkIfMenuItemLinkIsHighlighted(name: string) {
    return this.burgerMenuGetNavMenubyLabel(name).parent().should('have.class', 'active-menu-link');
  }

  /**
   * Check if menu is open
   */
  static checkOpen() {
    this.sideMenu().should('exist');
  }

  /**
   * Check if menu is closed
   */
  static checkClosed() {
    this.sideMenu().should('not.exist');
  }

  /**
   * Get side navigation
   * @returns {Cypress.Chainable}
   */
  private static sideMenu(): Cypress.Chainable {
    return cy.get('body').getId('side-menu');
  }

  /**
   * Get menu category labels
   * @returns {Cypress.Chainable}
   */
  categories(): Cypress.Chainable {
    return this.self().find('.body .category');
  }

  /**
   * Get all the links of the side navigation
   * @returns {Cypress.Chainable}
   */
  links(): Cypress.Chainable {
    return this.self().find('.body .option');
  }

  /**
   * Get all the available cluster navigation links
   * @returns {Cypress.Chainable}
   */
  clusters(): Cypress.Chainable {
    return this.self().find('.body .clusters .cluster.selector.option');
  }

  /**
   * Get the Home link
   * @returns {Cypress.Chainable}
   */
  home(): Cypress.Chainable {
    return this.self().find('.body > div > a').first();
  }
}
