//@ts-check
import { PanelController } from "./PanelController.js";

export class NavigationController {
    static cardInterface = null;
    static activeViewportIndex = 0;

    static view = null;
    static navigationControl = null;

    static init(cardInterface, viewportContainer) {
        NavigationController.cardInterface = cardInterface;

        NavigationController.view = viewportContainer;
        NavigationController.navigationControl = NavigationController.view.querySelector("#navigationControl");

        NavigationController.navigationControl.addEventListener("click", () => {
            NavigationController.cardInterface.getController("playback").togglePlay();
        });
        NavigationController.navigationControl.addEventListener("contextmenu", (event) => {
            event.preventDefault();
            PanelController.show("#playlistSubmitPanel");
        });
        NavigationController.navigationControl.addEventListener("touchstart", (event) => {
            NavigationController.startNavigation(event);
        });
        NavigationController.navigationControl.addEventListener("mousedown", (event) => {
            NavigationController.startNavigation(event);
        });
    }

    static startNavigation(event) {
        const originalMousePositionX = event.screenX || event.touches[0].screenX;
        const originalMousePositionY = event.screenY || event.touches[0].screenY;
        //Save the button image
        const buttonImageSrc = NavigationController.navigationControl.firstElementChild.src;

        window.addEventListener("touchmove", determineProcedure);
        window.addEventListener("mousemove", determineProcedure);
        window.addEventListener("touchend", executeProcedure);
        window.addEventListener("mouseup", executeProcedure);

        let differenceX = 0;
        let differenceY = 0;
        let procedureToExecute = () => { }

        //INNER EVENT HANDLER FUNCTIONS
        function determineProcedure(event) {
            //Calculate the travelledDistance of the mouse as a vector
            differenceX = (event.screenX || event.touches[0].screenX) - originalMousePositionX;
            differenceY = (event.screenY || event.touches[0].screenY) - originalMousePositionY;

            const absoluteDifferenceX = Math.abs(differenceX);
            const absoluteDifferenceY = Math.abs(differenceY);
            if (absoluteDifferenceX >= absoluteDifferenceY) {
                //CASE: x axis must be prioritized
                if (differenceX > 0) {
                    NavigationController.navigationControl.firstElementChild.src = "/musix/images/musix/glyph_skipNext.png";
                    procedureToExecute = () => {
                        NavigationController.cardInterface.getController("playback").skipTrack("next");
                    };
                } else if (differenceX < 0) {
                    NavigationController.navigationControl.firstElementChild.src = "/musix/images/musix/glyph_skipPrevious.png";
                    procedureToExecute = () => {
                        NavigationController.cardInterface.getController("playback").skipTrack("previous");
                    };
                }
            } else {
                //CASE: y axis must be prioritized
                if (differenceY > 0) {
                    NavigationController.navigationControl.firstElementChild.src = "/musix/images/musix/glyph_assign.png";
                    procedureToExecute = () => {
                        NavigationController.switchViewport();
                    };
                } else if (differenceY < 0) {
                    NavigationController.navigationControl.firstElementChild.src = "/musix/images/musix/glyph_search.png";
                    procedureToExecute = () => {
                        PanelController.show("#searchPanel");
                    };
                }
            }
        }

        function executeProcedure() {
            NavigationController.navigationControl.firstElementChild.src = buttonImageSrc;
            procedureToExecute();
            //Remove all previously added eventListeners
            window.removeEventListener("touchmove", determineProcedure);
            window.removeEventListener("mousemove", determineProcedure);
            window.removeEventListener("touchend", executeProcedure);
            window.removeEventListener("mouseup", executeProcedure);
        }
    }

    static switchViewport(viewportIndex = null) {
        //Switch to next viewport if the viewportIndex is not specified
        const viewports = NavigationController.view.querySelectorAll(".viewport");
        if (viewportIndex === null) {
            if (NavigationController.activeViewportIndex === viewports.length - 1) {
                viewportIndex = 0;
            } else {
                viewportIndex = this.activeViewportIndex + 1;
            }
        }

        //Animate out activeViewport
        viewports[NavigationController.activeViewportIndex].classList.replace("popIn", "popOut");
        //Animate in viewport
        viewports[viewportIndex].classList.replace("popOut", "popIn");

        NavigationController.activeViewportIndex = viewportIndex;
    }
}