/**
 * Extracts context from the current page for AI assistant
 */

export interface PageContext {
  url: string;
  title: string;
  currentSection?: string;
  visibleText: string;
  interactiveElements: InteractiveElement[];
  forms: FormContext[];
}

export interface InteractiveElement {
  type: 'button' | 'link' | 'input' | 'select';
  text?: string;
  label?: string;
  placeholder?: string;
  name?: string;
  id?: string;
}

export interface FormContext {
  title?: string;
  fields: FormField[];
}

export interface FormField {
  type: string;
  label?: string;
  name?: string;
  placeholder?: string;
  required: boolean;
}

/**
 * Extracts page context for AI assistant
 */
export function extractPageContext(): PageContext {
  const url = window.location.href;
  const title = document.title;

  // Try to detect current section/tab
  const currentSection = detectCurrentSection();

  // Get visible text (limit to prevent token overflow)
  const visibleText = extractVisibleText();

  // Extract interactive elements
  const interactiveElements = extractInteractiveElements();

  // Extract forms
  const forms = extractForms();

  const context = {
    url,
    title,
    currentSection,
    visibleText,
    interactiveElements,
    forms,
  };

  return context;
}

/**
 * Detect current section/tab from URL or active elements
 */
function detectCurrentSection(): string | undefined {
  // Try to get from URL
  const pathSegments = window.location.pathname.split('/').filter(Boolean);
  if (pathSegments.length > 0) {
    return pathSegments[pathSegments.length - 1];
  }

  // Try to find active tab/navigation item
  const activeTab = document.querySelector('[data-state="active"]');
  if (activeTab) {
    return activeTab.getAttribute('data-value') || activeTab.textContent?.trim();
  }

  // Try aria-current
  const currentNav = document.querySelector('[aria-current="page"]');
  if (currentNav) {
    return currentNav.textContent?.trim();
  }

  return undefined;
}

/**
 * Extract visible text from the page (excluding scripts, styles)
 */
function extractVisibleText(): string {
  // Get main content area if possible
  const mainContent = document.querySelector('main') || document.body;

  // Clone to avoid modifying DOM
  const clone = mainContent.cloneNode(true) as HTMLElement;

  // Remove script and style elements
  clone.querySelectorAll('script, style, noscript').forEach((el) => el.remove());

  // Get text content
  let text = clone.innerText || clone.textContent || '';

  // Clean up: remove extra whitespace, limit length
  text = text
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 3000); // Limit to ~3000 chars to avoid token issues

  return text;
}

/**
 * Extract interactive elements (buttons, links, inputs)
 */
function extractInteractiveElements(): InteractiveElement[] {
  const elements: InteractiveElement[] = [];

  // Buttons
  document.querySelectorAll('button').forEach((btn) => {
    if (isElementVisible(btn)) {
      elements.push({
        type: 'button',
        text: btn.textContent?.trim() || undefined,
        id: btn.id || undefined,
      });
    }
  });

  // Links
  document.querySelectorAll('a[href]').forEach((link) => {
    if (isElementVisible(link)) {
      elements.push({
        type: 'link',
        text: link.textContent?.trim() || undefined,
        id: link.id || undefined,
      });
    }
  });

  // Inputs
  document.querySelectorAll('input, textarea, select').forEach((input) => {
    if (isElementVisible(input) && input instanceof HTMLInputElement) {
      const label = findLabelForInput(input);
      elements.push({
        type: input.tagName.toLowerCase() as 'input' | 'select',
        label: label || undefined,
        placeholder: input.placeholder || undefined,
        name: input.name || undefined,
        id: input.id || undefined,
      });
    }
  });

  // Limit to most relevant (first 30)
  return elements.slice(0, 30);
}

/**
 * Extract form information
 */
function extractForms(): FormContext[] {
  const forms: FormContext[] = [];

  document.querySelectorAll('form').forEach((form) => {
    if (isElementVisible(form)) {
      const fields: FormField[] = [];

      // Find title (heading before or inside form)
      const heading = form.querySelector('h1, h2, h3, h4');
      const title = heading?.textContent?.trim();

      // Extract form fields
      form.querySelectorAll('input, textarea, select').forEach((field) => {
        if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) {
          const label = findLabelForInput(field);
          fields.push({
            type: field.type || 'text',
            label: label || undefined,
            name: field.name || undefined,
            placeholder: (field as HTMLInputElement).placeholder || undefined,
            required: field.hasAttribute('required'),
          });
        }
      });

      if (fields.length > 0) {
        forms.push({
          title,
          fields,
        });
      }
    }
  });

  return forms;
}

/**
 * Check if element is visible
 */
function isElementVisible(element: Element): boolean {
  if (!(element instanceof HTMLElement)) return false;

  const style = window.getComputedStyle(element);
  return (
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    style.opacity !== '0' &&
    element.offsetParent !== null
  );
}

/**
 * Find label text for an input
 */
function findLabelForInput(input: HTMLElement): string | null {
  // Try label[for=id]
  if (input.id) {
    const label = document.querySelector(`label[for="${input.id}"]`);
    if (label) return label.textContent?.trim() || null;
  }

  // Try parent label
  const parentLabel = input.closest('label');
  if (parentLabel) {
    return parentLabel.textContent?.trim() || null;
  }

  // Try aria-label
  const ariaLabel = input.getAttribute('aria-label');
  if (ariaLabel) return ariaLabel;

  // Try preceding label sibling
  const prevSibling = input.previousElementSibling;
  if (prevSibling && prevSibling.tagName === 'LABEL') {
    return prevSibling.textContent?.trim() || null;
  }

  return null;
}

/**
 * Create a concise text summary for the AI
 * MINIMAL version - only include essential page info to preserve conversation context
 */
export function summarizePageContext(context: PageContext): string {
  const parts: string[] = [];

  // Just the basics - page title and section
  parts.push(`Page: ${context.title}`);
  
  if (context.currentSection) {
    parts.push(`Section: ${context.currentSection}`);
  }

  // Only include key interactive elements (no visible text dump!)
  // Limit to top 5 most important actions
  if (context.interactiveElements.length > 0) {
    const keyActions: string[] = [];
    
    // Prioritize buttons over inputs
    const buttons = context.interactiveElements.filter(el => el.type === 'button' && el.text);
    buttons.slice(0, 5).forEach((el) => {
      if (el.text && !el.text.includes('Close') && !el.text.includes('Cancel')) {
        keyActions.push(el.text);
      }
    });
    
    if (keyActions.length > 0) {
      parts.push(`Actions: ${keyActions.join(', ')}`);
    }
  }

  // Only mention if there's an active form (no field details)
  if (context.forms.length > 0) {
    const formTitles = context.forms
      .map(f => f.title)
      .filter(Boolean)
      .slice(0, 2);
    if (formTitles.length > 0) {
      parts.push(`Forms: ${formTitles.join(', ')}`);
    }
  }

  return parts.join(' | ');
}
