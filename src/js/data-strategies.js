

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
