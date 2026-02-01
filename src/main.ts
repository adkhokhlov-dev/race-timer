// main.ts
import Alpine from 'alpinejs';
import './styles.css';
import { Timer } from './timer';

// setupCounter


window.Alpine = Alpine

// Alpine.store('shop', {
//   name: 'Alpine-Shop',
//   products: ['Swiss Alp Chocolate', 'Car Alpine A110'],
// })

// Register the component globally
Alpine.data('timer', () => new Timer()); //

Alpine.start()