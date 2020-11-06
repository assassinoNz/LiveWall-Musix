//@ts-check
import { ZoomImage } from "./ZoomImage.js";

export class LiveWallController {
    cardInterface = null;
    setIntervalId = null;
    portraitCounter = 1;
    squareCounter = 1;
    landscapeCounter = 1;

    view = null;

    constructor(cardInterface, viewport) {
        this.cardInterface = cardInterface;
        this.view = viewport;

        //Add onclick to every child of areaContainer for viewing infoArea
        const areas = Array.from(this.view.querySelector("#areasContainer").children);
        for (let i = 0; i < areas.length; i++) {
            areas[i].addEventListener("dblclick", () => {
                const imageMetaDatum = this.cardInterface.getImageMetadata()[Number.parseInt(areas[i].dataset.imageIndex)];
                if (window.frameElement) {
                    //CASE: App is inside an iFrame
                    const imagePreviewPopUp = this.cardInterface.cardObject.createPopUpCard("/layouts/main/popUpCards/files_r_image.html");
                    //Allow more width than other popUpCards
                    imagePreviewPopUp.getView().style.maxWidth = "90vw";
                    imagePreviewPopUp.getView().querySelector("iframe").addEventListener("load", () => {
                        imagePreviewPopUp.popUpCardInterface.preview(`/liveWall/${imageMetaDatum.path.replace(this.cardInterface.getRootDirectoryPath(), "")}`);
                    });
                } else {
                    //CASE: App is not inside an iFrame
                    const orientation = areas[i].id.slice(0, -1);
                    const color = areas[i].style.backgroundColor;
                    const zoomImage = new ZoomImage(imageMetaDatum, orientation, color);
                    this.cardInterface.addZoomImage(zoomImage);
                }
            });
        }
    }

    validateAndViewRandomImage() {
        //Get a random imageIndex
        const imageIndex = Math.floor(Math.random() * (this.cardInterface.getImageMetadata().length));
        
        //Check if the hwRatio is calculated
        if (this.cardInterface.getImageMetadata()[imageIndex].hwRatio) {
            //View the image appropriately
            this.viewImage(imageIndex);
        } else {
            const image = new Image();
            image.onload = () => {
                //Calculate hwRatio
                this.cardInterface.getImageMetadata()[imageIndex].hwRatio = image.naturalHeight / image.naturalWidth;
                //View the image appropriately
                this.viewImage(imageIndex);
            };
            image.src = `/liveWall/${this.cardInterface.getImageMetadata()[imageIndex].path.replace(this.cardInterface.getRootDirectoryPath(), "")}`;
        }
    }

    viewImage(imageIndex) {
        const imageMetaDatum = this.cardInterface.getImageMetadata()[imageIndex];
        let randomAreaQuery = "";
        if (imageMetaDatum.hwRatio > 1.2) {
            //CASE: portrait
            randomAreaQuery = "#portrait" + this.portraitCounter;
            if (this.portraitCounter === 6) { this.portraitCounter = 1; } else { this.portraitCounter++; }
        } else if (imageMetaDatum.hwRatio < 3 / 4) {
            //CASE: landscape
            randomAreaQuery = "#landscape" + this.landscapeCounter;
            if (this.landscapeCounter === 3) { this.landscapeCounter = 1; } else { this.landscapeCounter++; }
        } else {
            //CASE: square
            randomAreaQuery = "#square" + this.squareCounter;
            if (this.squareCounter === 3) { this.squareCounter = 1; } else { this.squareCounter++; }
        }

        //Change the backgroundImage of the randomArea and store its data inside the element
        const randomArea = this.view.querySelector(randomAreaQuery);
        //NOTE: static directory is merged under liveWallRouter. So static file requests must start with "liveWall/"
        randomArea.src = `/liveWall/${imageMetaDatum.path.replace(this.cardInterface.getRootDirectoryPath(), "")}`;
        randomArea.dataset.imageIndex = imageIndex;
    }

    animateWall() {
        this.setIntervalId = window.setInterval(() => {
            this.validateAndViewRandomImage();
        }, 1500);
    }

    freezeWall() {
        clearInterval(this.setIntervalId);
        this.setIntervalId = null;
    }
}