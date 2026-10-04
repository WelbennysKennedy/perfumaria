import template from './template.html?raw';
import logic from './app/NoirLogic.js?raw';
import './styles/original.css';

window.__resources = {
  noirWordmark: new URL('/runtime/noir-wordmark.js', window.location.origin).href,
  noirScene: new URL('/runtime/noir-scene.js', window.location.origin).href,
};

document.body.innerHTML = template;

const applicationScript = document.querySelector('script[data-dc-script]');
if (!applicationScript) {
  throw new Error('NOIR: the original application script is missing from the template.');
}

applicationScript.textContent = logic;

const runtimeScript = document.createElement('script');
runtimeScript.src = '/runtime/dc-runtime.js';
runtimeScript.onerror = () => {
  throw new Error('NOIR: the original React runtime could not be loaded.');
};
document.head.append(runtimeScript);
