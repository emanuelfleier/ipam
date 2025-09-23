document.addEventListener('DOMContentLoaded', () => {

    // --- INTERACTIVIDAD 1: ACORDEÓN AL HACER CLIC ---

    const steps = document.querySelectorAll('.step');

    steps.forEach(step => {
        step.addEventListener('click', () => {
            // Si el paso en el que se hizo clic ya está activo, lo cerramos
            if (step.classList.contains('active')) {
                step.classList.remove('active');
            } else {
                // Si no, cerramos todos los demás...
                steps.forEach(s => s.classList.remove('active'));
                // ...y abrimos el que se clickeó.
                step.classList.add('active');
            }
        });
    });


    // --- INTERACTIVIDAD 2: ANIMACIÓN AL HACER SCROLL ---
    
    // El Intersection Observer es una forma moderna y eficiente de detectar
    // cuándo un elemento entra en la pantalla.

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            // Si el elemento (entry) está ahora visible en la pantalla...
            if (entry.isIntersecting) {
                // ...le añadimos la clase 'visible' para que se active la animación CSS.
                entry.target.classList.add('visible');
            }
        });
    }, {
        threshold: 0.1 // Se activa cuando al menos el 10% del elemento es visible
    });

    // Le decimos al observer que vigile a cada uno de nuestros 'steps'.
    steps.forEach(step => {
        observer.observe(step);
    });

});