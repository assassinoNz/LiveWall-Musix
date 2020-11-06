export class Utility {
    static toggleButtonGlyph(buttonGlyph) {
        if (buttonGlyph.classList.toggle("revealed")) {
            buttonGlyph.children[1].style.display = "block";
            buttonGlyph.children[1].focus();
        } else {
            buttonGlyph.children[1].style.display = "none";
        }
    }
}