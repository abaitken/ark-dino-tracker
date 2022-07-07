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

let DataTools = new function () {
    let self = this;

    self.GenerateDatasetUrl = function (id) {
        if (location.href.startsWith('file'))
            return 'data/' + id + '.json';

        return 'api/index.php?id=' + id;
    };

    self.GenerateChunkedDatasetUrl = function (datasetId, id) {
        if (location.href.startsWith('file'))
            return 'data/' + datasetId + '/' + id + '.json';

        return 'api/index.php?id=' + id + '&set=' + datasetId;
    };

    self.GenerateDatasetMetaUrl = function (id) {
        if (location.href.startsWith('file'))
            return 'data/' + id + '-meta.json';

        return 'api/index.php?id=' + id + '&format=meta';
    };

    self.GenerateChunkedDatasetMetaUrl = function (datasetId) {
        if (location.href.startsWith('file'))
            return 'data/' + datasetId + '/meta.json';

        return 'api/index.php?id=classes&set=' + datasetId + '&format=meta';
    };

    self.FetchData = function (url) {
        return new Promise((resolve, reject) => {
            $.ajax({
                type: 'GET',
                url: url,
                dataType: 'json',
                mimeType: 'application/json',
                success: function (data) {
                    resolve(data);
                },
                error: function (error) {
                    reject(error);
                }
            });
        });
    };

    self.GetDatasetMode = function(dataset) {
        let mode = 'monolith';
        if (dataset.hasOwnProperty('Mode'))
            mode = dataset['Mode'];

        switch (mode) {
            case 'monolith':
                return DATA_MODES.MONOLITH;
            case 'chunked':
                return DATA_MODES.CHUNKED;
            default:
                throw "Unexpected dataset mode '" + mode + "'";
        }
    };
};

const DATA_MODES = {
    MONOLITH: 0,
    CHUNKED: 1
};

let levelColors = [
    { min: 0, max: 0, color: 'black' },
    { min: 1, max: 24, color: 'white' },
    { min: 25, max: 49, color: 'green' },
    { min: 50, max: 74, color: 'blue' },
    { min: 75, max: 99, color: 'purple' },
    { min: 100, max: 124, color: 'yellow' },
    { min: 125, max: 450, color: 'red' },
];

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

function Compare(left, right) {
    if (left < right)
        return -1;

    if (left > right)
        return 1;

    return 0;
}

const markerSize = 5;

function ViewModel() {
    let self = this;
    self.dataReady = ko.observable(false);
    self.messages = ko.observable('Fetching...');
    self.showTooltips = ko.observable(false);
    self.scale = ko.observable(1.0);
    self.creatureClasses = ko.observableArray([]);
    self.mappings = null;
    self.locationDataStrategy = new EmptyLocationDataStrategy([]);
    self.locations = ko.observableArray([]);
    self.colorLegend = levelColors;
    self.maps = [];
    self.selectedMap = ko.observable(null);
    self.datasets = ko.pureComputed(function () {
        let value = self.selectedMap();
        if (value == null)
            return [];
        return value.Datasets;
    });
    self.selectedDataset = ko.observable(null);
    self.selectedDataset.subscribe(function (newValue) {
        self.LoadDataset(newValue);
    });
    self.creatureNumber = ko.pureComputed(function () {
        return self.locations().length;
    });
    self.lastUpdated = ko.observable('unknown');
    self.selectedCreatureClass = ko.observable();
    self.selectedCreatureClassName = ko.pureComputed(function () {
        let value = self.selectedCreatureClass();
        if (value == null)
            return 'No selection';
        return value.Text;
    })
    self.selectedCreatureClass.subscribe(function (newValue) {
        if (newValue) {
            self.locationDataStrategy.Load(newValue.ClassName)
                .then((values) => {
                    self.locations(values);
                });
        }
        else
            self.locations([]);
    });
    self.topLocations = ko.pureComputed(function () {
        let values = self.locations();
        values.sort(function (left, right) {
            return Compare(left.Level, right.Level) * -1;
        });
        let result = values.slice(0, 25);
        return result;
    });
    self.ConvertLatToX = function (lat) {
        let map = self.selectedMap();
        let originalHeight = map.ImageOriginalHeight;
        let currentHeight = $("#mapImage").height();
        let scale = currentHeight / originalHeight;
        let factor = map.ScaleFactor;
        let imageTopOffset = map.ImageOffsetTop;
        return (imageTopOffset + (factor * lat) - (markerSize / 2)) * scale;
    };
    self.ConvertXToLon = function (x) {
        let map = self.selectedMap();
        let originalHeight = map.ImageOriginalHeight;
        let currentHeight = $("#mapImage").height();
        let scale = currentHeight / originalHeight;
        let factor = map.ScaleFactor;
        let imageTopOffset = map.ImageOffsetTop;
        return ((x / scale) - imageTopOffset) / factor;
    };
    self.ConvertLonToY = function (lon) {
        let map = self.selectedMap();
        let originalWidth = map.ImageOriginalWidth;
        let currentWidth = $("#mapImage").width();
        let scale = currentWidth / originalWidth;
        let factor = map.ScaleFactor;
        let imageLeftOffset = map.ImageOffsetLeft;
        return (imageLeftOffset + (factor * lon) - (markerSize / 2)) * scale;
    };
    self.ConvertYToLat = function (y) {
        let map = self.selectedMap();
        let originalWidth = map.ImageOriginalWidth;
        let currentWidth = $("#mapImage").width();
        let scale = currentWidth / originalWidth;
        let factor = map.ScaleFactor;
        let imageLeftOffset = map.ImageOffsetLeft;
        return ((y / scale) - imageLeftOffset) / factor;
    };

    self.fetchMappings = function () {
        return new Promise((resolve, reject) => {
            if (self.mappings) {
                resolve(self.mappings);
            }
            else {
                let url = DataTools.GenerateDatasetUrl('class-mapping');
                $.ajax({
                    type: 'GET',
                    url: url,
                    dataType: 'json',
                    mimeType: 'application/json',
                    success: function (data) {
                        self.mappings = data;
                        resolve(data);
                    },
                    error: function (error) {
                        reject(error);
                    }
                });
            }
        });
    };

    self.fetchSetData = function (dataset) {
        let urlSelector = function (dataset) {
            let mode = DataTools.GetDatasetMode(dataset);

            switch (mode) {
                case DATA_MODES.MONOLITH:
                    return DataTools.GenerateDatasetUrl(dataset.id);
                case DATA_MODES.CHUNKED:
                    return DataTools.GenerateChunkedDatasetUrl(dataset.id, 'classes');
                default:
                    throw "Unexpected dataset mode '" + mode + "'";
            }
        };
        return new Promise((resolve, reject) => {

            let url = urlSelector(dataset);
            DataTools.FetchData(url)
                .then((data) => {
                    resolve(data);
                });
        });
    };

    self.fetchDataMeta = function(dataset) {
        let urlSelector = function (dataset) {
            let mode = DataTools.GetDatasetMode(dataset);

            switch (mode) {
                case DATA_MODES.MONOLITH:
                    return DataTools.GenerateDatasetMetaUrl(dataset.id);
                case DATA_MODES.CHUNKED:
                    return DataTools.GenerateChunkedDatasetMetaUrl(dataset.id);
                default:
                    throw "Unexpected dataset mode '" + mode + "'";
            }
        };
        return new Promise((resolve, reject) => {

            let url = urlSelector(dataset);
            DataTools.FetchData(url)
                .then((data) => {
                    resolve(data);
                });
        });
    };


    self.handleErrors = function (errors) {
        let error = '';

        for (let index = 0; index < errors.length; index++) {
            const element = errors[index];
            error += element;
        }

        self.messages(error);
        console.error(errors);
        $('#messages').attr("class", "alert alert-danger");
    };

    self.RefreshData = function () {
        self.LoadDataset(self.selectedDataset());
    };

    self.CreateDataStrategy = function (dataset, data) {
        let mode = DataTools.GetDatasetMode(dataset);

        switch (mode) {
            case DATA_MODES.MONOLITH:
                return new MonolithLocationDataStrategy(data['Locations']);
            case DATA_MODES.CHUNKED:
                return new ChunkedLocationDataStrategy(dataset.id);
            default:
                throw "Unexpected dataset mode '" + mode + "'";
        }
    };

    self.LoadDataset = function (dataset) {
        Promise.all([self.fetchSetData(dataset), self.fetchMappings(), self.fetchDataMeta(dataset)])
            .then((values) => {
                let data = values[0];
                let mappings = values[1];
                let meta = values[2];
                self.lastUpdated(new Date(meta['LastUpdated']).toLocaleString());

                let currentClass = self.selectedCreatureClass();
                let selectedClass = null;

                let creatureClasses = [];
                for (let index = 0; index < data['CreatureClasses'].length; index++) {
                    const element = data['CreatureClasses'][index];

                    let name = mappings[element];
                    if (name == null)
                        name = element;

                    let item = new CreatureClass(element, name);
                    creatureClasses.push(item);

                    if (currentClass && currentClass.ClassName === element)
                        selectedClass = item;
                }
                creatureClasses.sort(function (left, right) {
                    return Compare(left.Text, right.Text);
                });
                self.creatureClasses(creatureClasses);
                self.locationDataStrategy = self.CreateDataStrategy(dataset, data);
                self.selectedCreatureClass(selectedClass);
                if (!self.dataReady())
                    self.dataReady(true);
            })
            .catch((errors) => {
                self.handleErrors(errors);
            });
    };

    self.devMode = ko.computed(function() {
        return location.search != null && location.search.includes('dev=');
    });

    self.devOverlayLines = ko.computed(function() {
        let result = [];
        if(self.devMode())
        {        
            for(let i = 0; i <= 10; i ++) {
                
                result.push({
                    i: i,
                    o: true
                });
                result.push({
                    i: i,
                    o: false
                });
            }
        }
        return result;
    });
    
    self.resizedNotifier = ko.observable();
    self.Init = function () {
        DataTools.FetchData(DataTools.GenerateDatasetUrl('maps'))
            .then((data) => {
                let selectedMaps = [];

                let devMode = self.devMode();
                for (let index = 0; index < data.length; index++) {
                    const element = data[index];
                    if (!element.Hidden || devMode)
                        selectedMaps.push(element);
                }

                self.maps = selectedMaps;
                self.selectedMap(self.maps[0]);
                self.selectedDataset(self.datasets()[0]);
                ko.applyBindings(self);
                //self.LoadDataset(self.selectedDataset());
                window.addEventListener('resize', function () {
                    self.resizedNotifier.valueHasMutated();
                });
            });
    };
}

function CreatureClass(className, name) {
    let self = this;
    self.ClassName = className;
    self.Text = name;
}

function MonolithLocationDataStrategy(allLocations) {
    let self = this;

    self.allLocations = allLocations;

    self.Load = function (id) {
        return new Promise((resolve, reject) => {
            resolve(self.allLocations[id]);
        });
    };
}

function ChunkedLocationDataStrategy(datasetId) {
    let self = this;

    self.datasetId = datasetId;

    self.Load = function (id) {
        return new Promise((resolve, reject) => {
            let url = DataTools.GenerateChunkedDatasetUrl(datasetId, id);
            DataTools.FetchData(url)
                .then((data) => {
                    resolve(data);
                });
        });
    };
}

function EmptyLocationDataStrategy() {
    let self = this;

    self.Load = function (id) {
        return new Promise((resolve, reject) => {
            resolve([]);
        });
    };
}

let vm = new ViewModel();
vm.Init();