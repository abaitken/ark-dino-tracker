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

var UpdateTooltipPosition = function (element) {

	let rect = element.getBoundingClientRect()
	let topOffset = rect.top;
	let leftOffset = rect.left;
	let mouseOffsetTop = 10;
	let mouseOffsetLeft = 10;
	return function(event) {
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
		$(element).on("mouseenter", function(event) {
			if(viewModel.showTooltips())
				$(".coordinateTooltip").css({display: 'block'});
		});
		$(element).on("mouseleave", function(event){			
			$(".coordinateTooltip").css({display: 'none'});
		});


		ko.utils.domNodeDisposal.addDisposeCallback(element, function () {
			$(".coordinateTooltip").css({display: 'none'});
			$(element).off("mousemove", UpdateTooltipPosition(element));
		});
	}
};

var levelColors = [
	{ min: 0, max: 24, color: 'white' },
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
	self.allLocations = ko.observableArray([]);
	self.locations = ko.observableArray([]);
	self.colorLegend = levelColors;
	self.creatureNumber = ko.computed(function () {
		return self.locations().length;
	});
	self.lastUpdated = ko.observable('unknown');
	self.selectedCreatureClass = ko.observable();
	self.selectedCreatureClassName = ko.computed(function () {
		let value = self.selectedCreatureClass();
		if (value == null)
			return 'No selection';
		return value.Text;
	})
	self.selectedCreatureClass.subscribe(function (newValue) {
		if (newValue) {
			let values = self.allLocations()[newValue.ClassName];
			self.locations(values);
		}
		else
			self.locations([]);
	});
	self.topLocations = ko.computed(function () {
		let values = self.locations();
		values.sort(function (left, right) {
			return Compare(left.Level, right.Level) * -1;
		});
		let result = values.slice(0, 25);
		return result;
	});
	self.ConvertLatToX = function (lat) {
		const originalHeight = 2048;
		let currentHeight = $("#mapImage").height();
		let scale = currentHeight / originalHeight;
		let factor = 20;
		let imageTopOffset = 30;
		return (imageTopOffset + (factor * lat) - (markerSize / 2)) * scale;
	};
	self.ConvertXToLon = function(x) {
		const originalHeight = 2048;
		let currentHeight = $("#mapImage").height();
		let scale = currentHeight / originalHeight;
		let factor = 20;
		let imageTopOffset = 30;
		return ((x / scale) - imageTopOffset) / factor;
	};
	self.ConvertLonToY = function (lon) {
		const originalWidth = 2048;
		let currentWidth = $("#mapImage").width();
		let scale = currentWidth / originalWidth;
		let factor = 20;
		let imageLeftOffset = 20;
		return (imageLeftOffset + (factor * lon) - (markerSize / 2)) * scale;
	};
	self.ConvertYToLat = function(y) {
		const originalWidth = 2048;
		let currentWidth = $("#mapImage").width();
		let scale = currentWidth / originalWidth;
		let factor = 20;
		let imageLeftOffset = 20;
		return ((y / scale) - imageLeftOffset) / factor;
	};
	self.datasets = [{ url: 'wild.json', Text: 'Wild' }, { url: 'tamed.json', Text: 'Tamed' }];
	self.selectedDataset = ko.observable(self.datasets[0]);
	self.selectedDataset.subscribe(function (newValue) {
		self.LoadDataset(newValue.url);
	});

	self.fetchData = function (url) {
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
	}
    
    self.RefreshData = function() {
        self.fetchData(self.selectedDataset().url)
            .then((data) => {
                self.lastUpdated(data['LastUpdated']);

                let mappings = values[1];
                let creatureClasses = [];
                for (let index = 0; index < data['CreatureClasses'].length; index++) {
                    const element = data['CreatureClasses'][index];

                    let name = mappings[element];
                    if (name == null)
                        name = element;

                    let item = new CreatureClass(element, name);
                    creatureClasses.push(item);
                }
                creatureClasses.sort(function (left, right) {
                    return Compare(left.Text, right.Text);
                });
                self.creatureClasses(creatureClasses);
                self.allLocations(data['Locations']);
                self.selectedCreatureClass().valueHasMutated();
            })
            .catch((errors) => {

                let error = '';

                for (let index = 0; index < errors.length; index++) {
                    const element = errors[index];
                    error += element;
                }

                self.messages(error);
                $('#messages').attr("class", "alert alert-danger");
                // TODO : Text not displaying correctly
                $('#track-info').html("Error: " + error);
            });;
    };
	self.LoadDataset = function (url) {		
        self.selectedCreatureClass(null);
        self.dataReady(false);
        Promise.all([self.fetchData(url), self.fetchData('class-mapping.json')])
            .then((values) => {
                let data = values[0];
                self.lastUpdated(data['LastUpdated']);

                let mappings = values[1];
                let creatureClasses = [];
                for (let index = 0; index < data['CreatureClasses'].length; index++) {
                    const element = data['CreatureClasses'][index];

                    let name = mappings[element];
                    if (name == null)
                        name = element;

                    let item = new CreatureClass(element, name);
                    creatureClasses.push(item);
                }
                creatureClasses.sort(function (left, right) {
                    return Compare(left.Text, right.Text);
                });
                self.creatureClasses(creatureClasses);
                self.allLocations(data['Locations']);
                self.dataReady(true);
            })
            .catch((errors) => {

                let error = '';

                for (let index = 0; index < errors.length; index++) {
                    const element = errors[index];
                    error += element;
                }

                self.messages(error);
                $('#messages').attr("class", "alert alert-danger");
                // TODO : Text not displaying correctly
                $('#track-info').html("Error: " + error);
            });
	};

	self.resizedNotifier = ko.observable();
	self.Init = function () {
		ko.applyBindings(self);
		self.LoadDataset(self.datasets[0].url);
		window.addEventListener('resize', function(){
			self.resizedNotifier.valueHasMutated();
		});
	};
}

function CreatureClass(className, name) {
	let self = this;
	self.ClassName = className;
	self.Text = name;
}

var vm = new ViewModel();
vm.Init();