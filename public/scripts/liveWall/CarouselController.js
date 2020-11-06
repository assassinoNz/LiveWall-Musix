//@ts-check
export class CarouselController {
    cardInterface = null;

    view = null
    carouselImageCurrent = null;
    carouselImageNew = null;

    constructor(cardInterface, viewport) {
        this.cardInterface = cardInterface;
        this.view = viewport;

        //Add ontouchstart to carouselViewport for scrolling preview images
        this.view.addEventListener("touchstart", (event) => {
            const carouselController = this;
            //Add eventListeners
            window.addEventListener("touchmove", doSwipeViewPort);
            window.addEventListener("touchend", endSwipeViewport);
            //Declare and initialize variables
            const initialTouchPositionX = event.touches[0].screenX;

            //INNER EVENT HANDLER FUNCTIONS
            function doSwipeViewPort(event) {
                //Calculate the travelled distance of the finger as a vector
                const differenceX = initialTouchPositionX - event.touches[0].screenX;
                if (differenceX < -50) {
                    endSwipeViewport();
                    carouselController.scrollCarouselImage("previous");
                } else if (differenceX > 50) {
                    endSwipeViewport();
                    carouselController.scrollCarouselImage("next");
                }
            }

            function endSwipeViewport() {
                //Remove all previously added eventListeners
                window.removeEventListener("touchmove", doSwipeViewPort);
                window.removeEventListener("touchend", endSwipeViewport);
            }
        });
    }

    scrollCarouselImage(direction) {
        this.carouselImageCurrent = this.view.querySelector("#carouselImageCurrent");
        this.carouselImageNew = this.view.querySelector("#carouselImageNew");
        const carouselImageCurrentIndex = parseInt(this.carouselImageCurrent.dataset.imageIndex);

        let newImageIndex = -1;
        if (direction === "next") {
            newImageIndex = carouselImageCurrentIndex + 1;
        } else if (direction === "previous") {
            newImageIndex = carouselImageCurrentIndex - 1;
        }

        if ((direction === "next" && carouselImageCurrentIndex <= this.cardInterface.getImageMetadata().length - 2) || (direction === "previous" && carouselImageCurrentIndex >= 1)) {
            
            this.carouselImageCurrent.id = "carouselImageNew";
            this.carouselImageNew.id = "carouselImageCurrent";
            
            this.loadImageAtIndex(newImageIndex);
            
            //NOTE: By now references of carouselImages are changed
            this.carouselImageNew.style.animationName = `popOutCarouselImage-${direction}`;
            this.carouselImageCurrent.style.animationName = "popUpCarouselImage";
        }
    }

    loadImageAtIndex(imageIndex) {
        this.carouselImageCurrent = this.view.querySelector("#carouselImageCurrent");
        this.carouselImageNew = this.view.querySelector("#carouselImageNew");
        //NOTE: static directory is merged under liveWallRouter. So static file requests must start with "liveWall/"
        this.carouselImageCurrent.src = `/liveWall/${this.cardInterface.getImageMetadata()[imageIndex].path.replace(this.cardInterface.getRootDirectoryPath(), "")}`;
        this.carouselImageCurrent.dataset.imageIndex = (imageIndex).toString();
    }
}