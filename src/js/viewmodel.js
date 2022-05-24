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

var levelColors = [
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
let availableMaps = [
	{
		Id: "scorched",
		Text: "Scorched Earth",
		Image: "img/scorched_earth.jpg",
		ImageOriginalWidth: 2048,
		ImageOriginalHeight: 2048,
		ScaleFactor: 20,
		ImageOffsetLeft: 20,
		ImageOffsetTop: 30,
		Datasets: [{ id: 'se-wild', Text: 'Wild' }, { id: 'se-tamed', Text: 'Tamed' }, { id: 'se-structures', Text: 'Structures' }]
	},
	{
		Id: "island",
		Text: "The Island",
		Image: "img/the_island.jpeg",
		ImageOriginalWidth: 2048,
		ImageOriginalHeight: 2048,
		ScaleFactor: 20,
		ImageOffsetLeft: 20,
		ImageOffsetTop: 30,
		Datasets: [{ id: 'wild', Text: 'Wild' }, { id: 'tamed', Text: 'Tamed' }]
	}
];

function ViewModel() {
	let self = this;
	self.dataReady = ko.observable(false);
	self.messages = ko.observable('Fetching...');
	self.showTooltips = ko.observable(false);
	self.scale = ko.observable(1.0);
	self.creatureClasses = ko.observableArray([]);
	self.mappings = null;
	self.allLocations = ko.observableArray([]);
	self.locations = ko.observableArray([]);
	self.colorLegend = levelColors;
	self.maps = availableMaps;
	self.selectedMap = ko.observable(self.maps[0]);
	self.datasets = ko.pureComputed(function () {
		return self.selectedMap().Datasets;
	});
	self.selectedDataset = ko.observable(self.datasets()[0]);
	self.selectedDataset.subscribe(function (newValue) {
		self.LoadDataset(newValue.id);
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
			let values = self.allLocations()[newValue.ClassName];
			self.locations(values);
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

	self.fetchMappings = function () {
		return new Promise((resolve, reject) => {
			if (self.mappings) {
				resolve(self.mappings);
			}
			else {
                let url = self.GenerateDatasetUrl('class-mapping');
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
	self.handleErrors = function(errors) {
		let error = '';

		for (let index = 0; index < errors.length; index++) {
			const element = errors[index];
			error += element;
		}

		self.messages(error);
		$('#messages').attr("class", "alert alert-danger");
	};
    
    self.GenerateDatasetUrl = function(id) {
        if(location.href.startsWith('file'))
            return 'data/' + id + '.json';
        
        return 'api/index.php?id=' + id;
    };

	self.RefreshData = function () {
		self.LoadDataset(self.selectedDataset().id);
	};

	self.LoadDataset = function (id) {
        let url = self.GenerateDatasetUrl(id);
		Promise.all([self.fetchData(url), self.fetchMappings()])
			.then((values) => {
				let data = values[0];
				let mappings = values[1];
				self.lastUpdated(data['LastUpdated']);

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
				self.allLocations(data['Locations']);
				self.selectedCreatureClass(selectedClass);
				if(!self.dataReady())
					self.dataReady(true);
			})
			.catch((errors) => {
				self.handleErrors(errors);
			});
	};

	self.resizedNotifier = ko.observable();
	self.Init = function () {
		ko.applyBindings(self);
		self.LoadDataset(self.selectedDataset().id);
		window.addEventListener('resize', function () {
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