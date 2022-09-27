
function Compare(left, right) {
    if (left < right)
        return -1;

    if (left > right)
        return 1;

    return 0;
}

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
    self.realms = ko.pureComputed(function () {
        let value = self.selectedMap();
        if (value == null)
            return [];
        if (value['Realms'] === undefined)
            return [{
                Text: 'Default',
                URI: value.URI,
                ImageOriginalHeight: value.ImageOriginalHeight,
                ImageOriginalWidth: value.ImageOriginalWidth,
                ScaleFactor: value.ScaleFactor,
                ImageOffsetLeft: value.ImageOffsetLeft,
                ImageOffsetTop: value.ImageOffsetTop
            }]
        return value.Realms;
    });
    self.selectedRealm = ko.observable(null);
    self.imageData = ko.pureComputed(function () {
        let value = self.selectedRealm();
        if (value == null)
            return {
                URI: 'img/nomap.jpeg',
                ImageOriginalHeight: 2048,
                ImageOriginalWidth: 2048,
                ScaleFactor: 20,
                ImageOffsetLeft: 42,
                ImageOffsetTop: 30
            };
        if(value['URI'] === undefined)
            return {
                URI: 'img/nomap.jpeg',
                ImageOriginalHeight: 2048,
                ImageOriginalWidth: 2048,
                ScaleFactor: 20,
                ImageOffsetLeft: 42,
                ImageOffsetTop: 30
            };
        return value;
    });
    self.datasets = ko.pureComputed(function () {
        let value = self.selectedMap();
        if (value == null)
            return [];
        return value.Datasets;
    });
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
        let imageData = self.imageData();
        let originalHeight = imageData.ImageOriginalHeight;
        let currentHeight = $("#mapImage").height();
        let scale = currentHeight / originalHeight;
        let factor = imageData.ScaleFactor;
        let imageTopOffset = imageData.ImageOffsetTop;
        return (imageTopOffset + (factor * lat) - (markerSize / 2)) * scale;
    };
    self.ConvertXToLon = function (x) {
        let imageData = self.imageData();
        let originalHeight = imageData.ImageOriginalHeight;
        let currentHeight = $("#mapImage").height();
        let scale = currentHeight / originalHeight;
        let factor = imageData.ScaleFactor;
        let imageTopOffset = imageData.ImageOffsetTop;
        return ((x / scale) - imageTopOffset) / factor;
    };
    self.ConvertLonToY = function (lon) {
        let imageData = self.imageData();
        let originalWidth = imageData.ImageOriginalWidth;
        let currentWidth = $("#mapImage").width();
        let scale = currentWidth / originalWidth;
        let factor = imageData.ScaleFactor;
        let imageLeftOffset = imageData.ImageOffsetLeft;
        return (imageLeftOffset + (factor * lon) - (markerSize / 2)) * scale;
    };
    self.ConvertYToLat = function (y) {
        let imageData = self.imageData();
        let originalWidth = imageData.ImageOriginalWidth;
        let currentWidth = $("#mapImage").width();
        let scale = currentWidth / originalWidth;
        let factor = imageData.ScaleFactor;
        let imageLeftOffset = imageData.ImageOffsetLeft;
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

let vm = new ViewModel();
vm.Init();