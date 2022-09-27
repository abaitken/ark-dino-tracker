ko.bindingHandlers.position = {
    init: function (element, valueAccessor, allBindings, viewModel, bindingContext) {
    },
    update: function (element, valueAccessor, allBindings, viewModel, bindingContext) {
        let value = ko.unwrap(valueAccessor());
        ko.unwrap(vm.resizedNotifier());
        let parent = bindingContext['$parent'];
        let rect = $('#mapImage').position();
        let topOffset = rect.top;
        let leftOffset = rect.left;
        $(element).css({
            top: parent.ConvertLatToX(value.Lat) + topOffset,
            left: parent.ConvertLonToY(value.Lon) + leftOffset
        });
        // $(element).tooltip({
        // 	content: 'Lat: ' + value.Lat + ', Lon: ' + value.Lon
        // })
    }
};

function LevelToColor(level) {
    let result = levelColors[0].color;
    for (let index = 1; index < levelColors.length; index++) {
        const element = levelColors[index];
        if (level >= element.min) {
            result = element.color;
            continue;
        }
        break;
    }
    return result;
}

ko.bindingHandlers.levelIndicator = {
    init: function (element, valueAccessor, allBindings, viewModel, bindingContext) {
        let value = ko.unwrap(valueAccessor());
        $(element).css({
            'background-color': LevelToColor(value)
        });
    },
    update: function (element, valueAccessor, allBindings, viewModel, bindingContext) {
    }
};

ko.bindingHandlers.devOverlay = {
    init: function (element, valueAccessor, allBindings, viewModel, bindingContext) {
    },
    update: function (element, valueAccessor, allBindings, viewModel, bindingContext) {
        let value = ko.unwrap(valueAccessor());
        ko.unwrap(vm.resizedNotifier());
        let parent = bindingContext['$parent'];
        let mapImage = $('#mapImage');
        let rect = mapImage.position();
        let topOffset = rect.top;
        let leftOffset = rect.left;
        let width = mapImage.width();
        let height = mapImage.height();
        const lineThickness = 2;
        
        if(value.i === 5)
            $(element).addClass('devOverlayImportant');
        if(value.o) {
            let lineTop = parent.ConvertLatToX(value.i * 10);
            let lineLeft = parent.ConvertLonToY(0);
            let lineRight = parent.ConvertLonToY(100);
            let lineWidth = width - (width - lineRight) - lineLeft;
            $(element).css({
                width: lineWidth,
                height: lineThickness,
                top: lineTop,
                left: lineLeft
            });
        }
        else {
            let lineLeft = parent.ConvertLonToY(value.i * 10);
            let lineTop = parent.ConvertLatToX(0);
            let lineBottom = parent.ConvertLatToX(100);
            let lineHeight = height - (height - lineBottom) - lineTop;
            $(element).css({
                width: lineThickness,
                height: lineHeight,
                top: lineTop,
                left: lineLeft
            });
        }
    }
};

let UpdateTooltipPosition = function (element) {

    let rect = element.getBoundingClientRect()
    let topOffset = rect.top;
    let leftOffset = rect.left;
    let mouseOffsetTop = 10;
    let mouseOffsetLeft = 10;
    return function (event) {
        let left = event.pageX - leftOffset;
        let top = event.pageY - topOffset;
        $(".coordinateTooltip").css({
            "left": left + mouseOffsetLeft,
            "top": top + mouseOffsetTop
        });
        $(".coordinateTooltip").text('Lat: ' + Math.round(vm.ConvertYToLat(top)) + ', Lon: ' + Math.round(vm.ConvertXToLon(left)));
    };
};

ko.bindingHandlers.coordtooltip = {
    init: function (element, valueAccessor, allBindings, viewModel, bindingContext) {
        $(element).on("mousemove", UpdateTooltipPosition(element));
        $(element).on("mouseenter", function (event) {
            if (viewModel.showTooltips())
                $(".coordinateTooltip").css({ display: 'block' });
        });
        $(element).on("mouseleave", function (event) {
            $(".coordinateTooltip").css({ display: 'none' });
        });


        ko.utils.domNodeDisposal.addDisposeCallback(element, function () {
            $(".coordinateTooltip").css({ display: 'none' });
            $(element).off("mousemove", UpdateTooltipPosition(element));
        });
    }
};