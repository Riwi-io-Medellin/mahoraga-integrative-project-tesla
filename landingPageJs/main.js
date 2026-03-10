
import { initParallax } from '../landingPageJs/parallax.js';
import { initSmoothScroll } from './navigation.js';
import { initCarousel } from '../landingPageJs/carousel.js';
import { initAuthModal } from '../landingPageJs/modal.js';
import { redirectLoggedInUser } from '../js/services/sessionService.js';

initCarousel();

initParallax();

initSmoothScroll();

document.addEventListener('DOMContentLoaded', () => {
    if (redirectLoggedInUser()) {
        return;
    }

    initAuthModal();
    console.log('Mahoraga - All systems initialized ');
});
