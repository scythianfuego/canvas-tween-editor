// DOM handling helpers
const getElement = (selector) => document.querySelector(selector);
const getAll = (selector) => document.querySelectorAll(selector);
const getValue = (selector) => getElement(selector).value;
const setValue = (selector, value) => {
  getElement(selector).value = value;
};
const getWidth = (selector) =>
  getElement(selector).getBoundingClientRect().width;
const setHeight = (selector, val) => {
  const el = getElement(selector);
  if (typeof val === "function") val = val();
  if (typeof val === "string") el.style.height = val;
  else el.style.height = val + "px";
};
const listen = (selector, event, handler) => {
  getElement(selector).addEventListener(event, handler);
};
const listenAll = (selector, event, handler) => {
  getAll(selector).forEach((el) => {
    el.addEventListener(event, handler);
  });
};
const show = (selector) => {
  getElement(selector).style.display = "block";
};
const hide = (selector) => {
  getElement(selector).style.display = "none";
};

const onLoad = () => {
  const window_height = window.innerHeight;
  const top_height = Math.floor((2 * window_height) / 3);
  const bottom_height = Math.floor(window_height / 3);
  const small_height = Math.floor(top_height / 7);
  const big_height = Math.floor(2 * small_height);

  const height = 100;
  const width = getWidth("#onoff");
  const adjust_width = getWidth("#adjust");

  setHeight("#onoff", small_height);
  setHeight("#frequency", big_height);
  setHeight("#amplitude", big_height);
  setHeight("#iw", big_height);
  setHeight("#adjust", bottom_height);

  let pointSelected = null;
  const onPointSelection = function (point) {
    if (point) {
      pointSelected = point;
      setValue("#point_time", point.formatX());
      setValue("#point_value", point.formatY());
    } else {
      setValue("#point_time", "");
      setValue("#point_value", "");
    }
  };

  const setPoint = function (event) {
    if (!pointSelected) return;

    const time = getValue("#point_time");
    const value = getValue("#point_value");
    pointSelected.formatX(time).formatY(value);
  };

  listen("#set", "click", () => setPoint());
  listen("#point_time", "keyup", (event) => {
    if (event.key === "Enter") setPoint();
  });
  listen("#point_value", "keyup", (event) => {
    if (event.key === "Enter") setPoint();
  });

  const editors = {
    onoff: new TweenEditor(getElement("#onoff"), {
      onPointSelection: onPointSelection,
      height: small_height,
      width: width,
      gridVSubdiv: 2,
      min: 0,
      max: 1,
      units: "",
    }),
    freq: new TweenEditor(getElement("#frequency"), {
      onPointSelection: onPointSelection,
      height: big_height,
      width: width,
      gridVSubdiv: 8,
      min: 1,
      max: 500,
      units: "Hz",
    }),
    amp: new TweenEditor(getElement("#amplitude"), {
      onPointSelection: onPointSelection,
      height: big_height,
      width: width,
      gridVSubdiv: 8,
      min: 0,
      max: 100,
    }),
    iw: new TweenEditor(getElement("#iw"), {
      onPointSelection: onPointSelection,
      height: big_height,
      width: width,
      gridVSubdiv: 8,
      min: 1,
      max: 80,
      units: "",
    }),
    adjust: new TweenEditor(getElement("#adjust"), {
      onPointSelection: onPointSelection,
      height: bottom_height,
      width: adjust_width,
      gridVSubdiv: 8,
    }),
  };
  TweenEditor.link([editors.onoff, editors.freq, editors.amp, editors.iw]);
  editors.adjust.cleanTags("AAAA");

  const currentTag = () => {
    const tagSelectors = [
      ".left-right-counter[data-track=onoff] .left-right-counter-value",
      ".left-right-counter[data-track=freq] .left-right-counter-value",
      ".left-right-counter[data-track=amp] .left-right-counter-value",
      ".left-right-counter[data-track=iw] .left-right-counter-value",
    ];
    return tagSelectors.reduce((acc, curr) => acc + getValue(curr), "");
  };

  const storage = new Storage();
  listenAll(".left-right-counter-value", "beforechange", function (event) {
    const track = event.target.parentElement.getAttribute("data-track");
    storage.setData(track, event.target.value, editors[track].getPoints());
    editors.adjust.setTag(currentTag());
  });

  listenAll(".left-right-counter-value", "afterchange", (event) => {
    const track = event.target.parentElement.getAttribute("data-track");
    editors[track].setPoints(storage.getData(track, event.target.value));
    editors.adjust.setTag(currentTag());
  });

  listen("#apply_tags", "click", (event) => {
    editors.adjust.setTag(currentTag());
    storage.setData("adjust", "A", editors["adjust"].getPoints());
  });

  listen("#clean_tags", "click", (event) => {
    editors.adjust.cleanTags("AAAA");
  });

  let trackCount = 0;
  const updateTrackList = function () {
    trackCount = 0;
    getElement("#load_name").innerHTML = "";
    for (const i of Object.keys(localStorage)) {
      const o = document.createElement("option");
      o.setAttribute("name", i);
      o.textContent = i;
      getElement("#load_name").appendChild(o);
      trackCount++;
    }
  };
  updateTrackList();

  const storeCurrent = function () {
    //store all
    const tag = currentTag().split("");
    storage.setData("onoff", tag[0], editors["onoff"].getPoints());
    storage.setData("freq", tag[1], editors["freq"].getPoints());
    storage.setData("amp", tag[2], editors["amp"].getPoints());
    storage.setData("iw", tag[3], editors["iw"].getPoints());
    storage.setData("adjust", "A", editors["adjust"].getPoints());
  };

  const exportTrack = function () {
    storeCurrent();
    const text = storage.export();
    setValue("#export_data", text);
  };

  listen("#export", "click", () => {
    storeCurrent();
    updateTrackList();
    getElement(".modal-lock").style.display = "block";
  });

  listen("#btn-close", "click", () => {
    getElement(".modal-lock").style.display = "none";
  });

  setValue("#save_name", "Track " + trackCount);

  listen("#load_name", "click", () => {
    setValue("#save_name", getValue("#load_name"));
  });

  listen("#btn-save", "click", () => {
    const name = getValue("#save_name");
    const track = storage.getAll();
    localStorage.setItem(name, JSON.stringify(track));
    updateTrackList();
  });

  listen("#btn-delete", "click", () => {
    const name = getElement("#load_name").value;
    if (name && confirm("Delete " + name + "?")) {
      localStorage.removeItem(name);
      updateTrackList();
    }
  });

  listen("#btn-load", "click", () => {
    const name = getElement("#load_name").value;
    if (name) {
      const track = JSON.parse(localStorage.getItem(name));
      storage.setAll(track);

      editors["onoff"].setPoints(storage.getData("onoff", "A"));
      editors["freq"].setPoints(storage.getData("freq", "A"));
      editors["amp"].setPoints(storage.getData("amp", "A"));
      editors["iw"].setPoints(storage.getData("iw", "A"));
      editors["adjust"].setPoints(storage.getData("adjust", "A"));

      exportTrack();
      getElement(".left-right-counter-value").value = "A";
    }
  });
};

const onReady = () => {
  getAll(".left-right-counter").forEach((el) => {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    const leftArrow = document.createElement("i");
    leftArrow.className = "fa fa-chevron-circle-left fakelink left-arrow";
    const rightArrow = document.createElement("i");
    rightArrow.className = "fa fa-chevron-circle-right fakelink right-arrow";
    const input = document.createElement("input");
    input.className = "left-right-counter-value";
    input.size = 1;
    input.type = "text";
    input.value = alphabet[0];

    el.appendChild(leftArrow);
    el.appendChild(input);
    el.appendChild(rightArrow);

    rightArrow.addEventListener("click", (event) => {
      let index = alphabet.indexOf(input.value);
      if (index != -1 && index < alphabet.length - 1) {
        input.dispatchEvent(
          new CustomEvent("beforechange", {
            detail: { value: input.value },
          }),
        );
        input.value = alphabet[++index];
        input.dispatchEvent(
          new CustomEvent("afterchange", {
            detail: { value: input.value },
          }),
        );
      }
    });
    leftArrow.addEventListener("click", (event) => {
      let index = alphabet.indexOf(input.value);
      if (index != -1 && index > 0) {
        input.dispatchEvent(
          new CustomEvent("beforechange", {
            detail: { value: input.value },
          }),
        );
        input.value = alphabet[--index];
        input.dispatchEvent(
          new CustomEvent("afterchange", {
            detail: { value: input.value },
          }),
        );
      }
    });
  });

  window.addEventListener("load", onLoad);
};

if (document.readyState !== "loading") {
  onReady();
} else {
  document.addEventListener("DOMContentLoaded", onReady);
}
