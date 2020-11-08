//@ts-check
import { PlaylistExplorerController } from "./PlaylistExplorerController.js";
import { Utility } from "./Utility.js";

export class NowPlayingController {
    static cardInterface = null;

    static view = null;
    static seekSlider = null;
    static volumeSlider = null;
    static playTimeDisplays = null;
    static controls = null;

    static init(cardInterface, viewport) {
        NowPlayingController.cardInterface = cardInterface;

        NowPlayingController.view = viewport;
        NowPlayingController.seekSlider = NowPlayingController.view.querySelector("#seekSlider");
        NowPlayingController.volumeSlider = NowPlayingController.view.querySelector("#volumeSlider");
        NowPlayingController.playTimeDisplays = NowPlayingController.view.querySelectorAll(".playTimeDisplay");
        NowPlayingController.controls = NowPlayingController.view.querySelectorAll("#controlsContainer>div>button");

        //Add onpointerdown to volumeSlider for changing volume
        //NOTE: Changing volume is done in realtime except in RemotePlay
        NowPlayingController.volumeSlider.addEventListener("pointerdown", (event) => {
            NowPlayingController.startSlide(event, 70.5, 221.8, null, () => {
                if (!NowPlayingController.cardInterface.getController("playback").isRemotePlay()) {
                    NowPlayingController.cardInterface.getController("playback").setVolume(Utility.getCircularSliderValue(NowPlayingController.volumeSlider, 70.5, 221.8, 1));
                }
            }, () => {
                NowPlayingController.cardInterface.getController("playback").setVolume(Utility.getCircularSliderValue(NowPlayingController.volumeSlider, 70.5, 221.8, 1));
            });
        });

        //Add events to all controls
        NowPlayingController.controls[0].addEventListener("click", (event) => {
            const keyword = prompt("Specify a keyword to start search");
            if (keyword) {
                PlaylistExplorerController.search(keyword);
            }
        });
        NowPlayingController.controls[1].addEventListener("click", (event) => {
            NowPlayingController.cardInterface.getController("playback").toggleRemotePlay();
        });
        NowPlayingController.controls[2].addEventListener("click", () => {
            NowPlayingController.cardInterface.getController("playback").togglePlay();
        });
        NowPlayingController.controls[2].addEventListener("touchstart", (event) => {
            NowPlayingController.startNavigation(event);
        });
        NowPlayingController.controls[2].addEventListener("mousedown", (event) => {
            NowPlayingController.startNavigation(event);
        });
    }

    static setState(state, value) {
        switch (state) {
            case "offline": {
                document.getElementById("overlayContainer").style.display = "none";
                if (value) {
                    NowPlayingController.controls[1].style.display = "none";
                }
                
                break;
            }

            case "playback": {
                if (value) {
                    NowPlayingController.cardInterface.retrieveControls[1].firstElementChild.src = "/musix/images/musix/glyph_pause.png";
                    NowPlayingController.controls[2].firstElementChild.src = "/musix/images/musix/glyph_pause.png";
                    NowPlayingController.controls[2].classList.add("active");
                } else {
                    NowPlayingController.cardInterface.retrieveControls[1].firstElementChild.src = "/musix/images/musix/glyph_play.png";
                    NowPlayingController.controls[2].firstElementChild.src = "/musix/images/musix/glyph_play.png";
                    NowPlayingController.controls[2].classList.remove("active");
                }

                break;
            }

            case "remotePlay": {
                if (value) {
                    NowPlayingController.controls[1].classList.add("active");
                } else {
                    NowPlayingController.controls[1].classList.remove("active");
                }

                break;
            }
        }
    }

    static updateViewSection(section, value) {
        switch (section) {
            case "volume": {
                NowPlayingController.playTimeDisplays[2].textContent = Math.round(value * 100).toString();
                Utility.setCircularSliderView(NowPlayingController.volumeSlider, 70.5, 221.8, 1, value);
                break;
            }

            case "playlist": {
                NowPlayingController.view.querySelector("#playlistDisplay").innerHTML = value.name;
                document.styleSheets[0].cssRules[2].style.setProperty("--themeColor", value.themeColor);
                break;
            }

            case "track": {
                NowPlayingController.view.querySelector("#artistDisplay").textContent = value.artist;
                NowPlayingController.view.querySelector("#titleDisplay").textContent = value.title;

                //Update media session metadata
                navigator.mediaSession.metadata = new MediaMetadata(value);

                break;
            }

            case "seek": {
                Utility.setCircularSliderView(NowPlayingController.seekSlider, 196.5, 343.5, value[0], value[1]);
                NowPlayingController.playTimeDisplays[0].textContent = value[2];
                NowPlayingController.playTimeDisplays[1].textContent = value[3];
                break;
            }

            case "time": {
                NowPlayingController.playTimeDisplays[0].textContent = value[0];
                NowPlayingController.playTimeDisplays[1].textContent = value[1];
                break;
            }
        }

    }

    static startSlide(event, startTheta, endTheta, executeBeforeDoSlide, executeWithDoSlide, executeAfterDoSlide) {
        //Get a reference of "event.currentTarget" for inner functions
        const slider = event.currentTarget;
        //Get the boundary of the slider
        const sliderRect = slider.getBoundingClientRect();
        //Calculate slider's center using sliderTrackPosition
        const sliderCenterX = (sliderRect.width / 2) + sliderRect.left;
        const sliderCenterY = (sliderRect.height / 2) + sliderRect.top;
        //Add eventListeners
        window.addEventListener("pointermove", doSlide);
        window.addEventListener("touchmove", doSlide);
        window.addEventListener("pointerup", endSlide);
        window.addEventListener("touchend", endSlide);
        //Execute additional functionality
        if (executeBeforeDoSlide) {
            executeBeforeDoSlide();
        }

        //INNER EVENT HANDLER FUNCTIONS
        function doSlide(event) {
            //Get mousePositions
            const pointerPositionY = event.clientY || event.touches[0].clientY;
            const pointerPositionX = event.clientX || event.touches[0].clientX;
            //Calculate lengths of the adjacentSide (distanceDifferenceY) and the oppositeSide (distanceDifferenceX) relative to sliderCenter;
            const distanceDifferenceX = sliderCenterX - pointerPositionX;
            const distanceDifferenceY = pointerPositionY - sliderCenterY;
            //Calculate theta(acute angle) after calculating tanTheta(absoluteValue)
            const tanTheta = Math.abs(distanceDifferenceX / distanceDifferenceY);
            let theta = Math.atan(tanTheta) * (180 / Math.PI);
            //Adjust theta considering circular sides
            if (distanceDifferenceX > 0 && distanceDifferenceY > 0) {
                theta = theta;
            } else if (distanceDifferenceX >= 0 && distanceDifferenceY < 0) {
                theta = 180 - theta;
            } else if (distanceDifferenceX < 0 && distanceDifferenceY < 0) {
                theta = 180 + theta;
            } else if (distanceDifferenceX <= 0 && distanceDifferenceY > 0) {
                theta = 360 - theta;
            } else if (distanceDifferenceX > 0 && distanceDifferenceY === 0) {
                theta = 90;
            } else if (distanceDifferenceX < 0 && distanceDifferenceY === 0) {
                theta = 270;
            }
            if (startTheta < theta && theta < endTheta) {
                //Rotate slider theta degrees
                slider.style.transform = `rotate(${theta}deg)`;
            }
            //Execute additional functionality
            if (executeWithDoSlide) {
                executeWithDoSlide();
            }
        }

        function endSlide() {
            //Remove added eventListeners
            window.removeEventListener("pointermove", doSlide);
            window.removeEventListener("touchmove", doSlide);
            window.removeEventListener("pointerup", endSlide);
            window.removeEventListener("touchend", endSlide);
            //Execute additional functionality
            if (executeAfterDoSlide) {
                executeAfterDoSlide();
            }
        }
    }

    static startNavigation(event) {
        const originalMousePositionX = event.screenX || event.touches[0].screenX;
        const originalMousePositionY = event.screenY || event.touches[0].screenY;
        //Save the button image
        const buttonImageSrc = NowPlayingController.controls[2].firstElementChild.src;

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
                    NowPlayingController.controls[2].firstElementChild.src = "/musix/images/musix/glyph_skipNext.png";
                    procedureToExecute = () => {
                        NowPlayingController.cardInterface.getController("playback").skipTrack("next");
                    };
                } else if (differenceX < 0) {
                    NowPlayingController.controls[2].firstElementChild.src = "/musix/images/musix/glyph_skipPrevious.png";
                    procedureToExecute = () => {
                        NowPlayingController.cardInterface.getController("playback").skipTrack("previous");
                    };
                }
            } else {
                //CASE: y axis must be prioritized
                if (differenceY > 0) {
                    NowPlayingController.controls[2].firstElementChild.src = "";
                    procedureToExecute = () => {
                        const panelContainer = document.getElementById("panelContainer");
                        if (panelContainer.classList.contains("popIn")) {
                            panelContainer.classList.replace("popIn", "popOut");
                        } else {
                            panelContainer.classList.replace("popOut", "popIn");
                        }
                    };
                } else if (differenceY < 0) {
                    NowPlayingController.controls[2].firstElementChild.src = "";
                    procedureToExecute = () => {

                    };
                }
            }
        }

        function executeProcedure() {
            NowPlayingController.controls[2].firstElementChild.src = buttonImageSrc;
            procedureToExecute();
            //Remove all previously added eventListeners
            window.removeEventListener("touchmove", determineProcedure);
            window.removeEventListener("mousemove", determineProcedure);
            window.removeEventListener("touchend", executeProcedure);
            window.removeEventListener("mouseup", executeProcedure);
        }
    }
}