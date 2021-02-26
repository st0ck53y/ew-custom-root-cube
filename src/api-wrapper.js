// TODO xhr intercept for non-user-scripted calls would be needed is needed, but that will get super messy with recursion if not thought out...

function getHierarchy(version, cubeId, successCallback, errCallback) {
	return getHierarchy('1.0', cubeId, successCallback, errCallback);
}

function getHierarchy(version, cubeId, successCallback, errCallback) {
	return $.getJSON('/'+version+'/task/' + cubeId + '/hierarchy').done(function (data) {
		// https://eyewire.org/apidoc#/get-task_hierarchy
		// ordered maybe-unstructured list of ancestors and decendants
		// response: {
		//   "ancestors":[num,num...],
		//   "descendents":[num,num...]
		// }
		// First entry of `ancestors` is the root of the cell
		// First entry of `decendents` is the oldest child of the cube
		return successCallback(data);
	})
	.fail(function (data) {
		return errCallback(data);
	});
}

function getAncestors(version, cubeId, successCallback, errCallback) {
	getAncestors('1.0', cubeId, successCallback, errCallback);
}

function getAncestors(version, cubeId, successCallback, errCallback) {
	return $.getJSON('/'+version+'/task/' + cubeId + '/ancestors').done(function (data) {
		// https://eyewire.org/apidoc#/get-task_ancestors
		// ordered maybe-unstructured list of ancestors
		// response: [num,num...]
		// First entry is the root of the cell
		return successCallback(data);
	})
	.fail(function (data) {
		return errCallback(data);
	});
}

function getDescendents(version, cubeId, successCallback, errCallback) {
	return getDescendents('1.0', cubeId, successCallback, errCallback);
}

function getDescendents(version, cubeId, successCallback, errCallback) {
	return $.getJSON('/'+version+'/task/' + cubeId + '/descendents').done(function (data) {
		// https://eyewire.org/apidoc#/get-task_descendents
		// ordered maybe-unstructured list of decendents
		// response: [num,num...]
		// First entry is the oldest child of the cube
		return successCallback(data);
	})
	.fail(function (data) {
		return errCallback(data);
	});
}

function getAggregate(cubeId, successCallback, errCallback) {
	return getAggregate('1.0', cubeId, successCallback, errCallback);
}

function getAggregate(version, cubeId, successCallback, errCallback) {
	return $.getJSON('/'+version+'/task/' + cubeId + '/aggregate').done(function (data) {
		// https://eyewire.org/apidoc#/get-task_aggregate
		// general data about the cube, used for eg info panel
		// response: {
		//   "segments": {num:num,num:num...},
		//   "weight": num,
		//   "traces": num,
		//   "status": num,
		//   "flagged": bool,
		//   "splitpoint": bool,
		//   "assignable": bool,
		//   "task_family": {"parent":num,"children":[num,num...]}
		//   "votes": {"total":num,"max":num}
		//   "inspected": bool
		// }
		return successCallback(data);
	})
	.fail(function (data) {
		return errCallback(data);
	});
}

