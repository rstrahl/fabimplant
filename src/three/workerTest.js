// workerTest.js
//
// Simple test to confirm worker operation

addEventListener('message', e => {
	if(e.data === "start") {

		let a = [];

		for(let i = 50000; i >= 0; i--) {
			a.push(i);
		}

		let start = new Date().getTime();
		bubbleSort(a);
		let end = new Date().getTime();
		let time = end - start;
		postMessage(time);
	}
});

function bubbleSort(a) {
	let swapped;
	do {
		swapped = false;
		for(let i = 0; i < a.length - 1; i++) {
			if(a[i] > a[i + 1]) {
				let temp = a[i];
				a[i] = a[i + 1];
				a[i + 1] = temp;
				swapped = true;
			}
		}
	} while (swapped);
}
