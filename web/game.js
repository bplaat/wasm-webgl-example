const canvas = document.getElementById('canvas');
const gl = canvas.getContext('webgl2');

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
function readString(addr) {
    const buffer = new Uint8Array(instance.exports.memory.buffer, addr);
    return textDecoder.decode(buffer.subarray(0, buffer.indexOf(0)));
}
function readStringFromPtr(addr) {
    const buffer = new Uint32Array(instance.exports.memory.buffer, addr, 1);
    return readString(buffer[0]);
}
function writeString(addr, string, lengthAddr = 0, bufferLength = undefined) {
    const stringBuffer = new Uint8Array(instance.exports.memory.buffer, addr);
    const stringBytes = textEncoder.encode(string);
    const stringLength = bufferLength != undefined ? Math.min(stringBytes.length, bufferLength) : stringBytes.length;
    if (lengthAddr != 0) {
        const lengthBuffer = new Uint32Array(instance.exports.memory.buffer, lengthAddr, 1);
        lengthBuffer[0] = stringLength;
    }
    let pos = 0;
    while (pos < stringLength) {
        stringBuffer[pos] = stringBytes[pos];
        pos++;
    }
    stringBuffer[pos] = 0;
}

let running = true, printBuffer = '';
const shaders = [], programs = [], vertexArrays = [], buffers = [], attributes = [], uniforms = [], textures = [], images = [];

const bindings = {
    print(string) {
        printBuffer += readString(string);
    },
    println(string) {
        console.log(printBuffer + readString(string));
        printBuffer = '';
    },
    exit(status) {
        console.log(`Exited with status ${status}`);
        running = false;
    },
    sin: Math.sin,
    cos: Math.cos,
    tan: Math.tan,
    time(timer) {
        return Math.floor(Date.now() / 1000);
    },

    glGetString(name) {
        const string = gl.getParameter(name);
        const stringAddr = instance.exports.malloc(string.length + 1);
        writeString(stringAddr, string);
        return stringAddr;
    },
    glViewport(x, y, width, height) {
        gl.viewport(x, y, width, height);
    },
    glClearColor(red, green, blue, alpha) {
        gl.clearColor(red, green, blue, alpha);
    },
    glClear(mask) {
        gl.clear(mask);
    },
    glScissor(x, y, width, height) {
        gl.scissor(x, y, width, height);
    },
    glEnable(cap) {
        gl.enable(cap);
    },
    glDisable(cap) {
        gl.disable(cap);
    },
    glBlendFunc(sfactor, dfactor) {
        gl.blendFunc(sfactor, dfactor);
    },

    glCreateShader(shaderType) {
        const shader = shaders.length;
        shaders[shader] = gl.createShader(shaderType);
        return shader;
    },
    glShaderSource(shader, count, string, length) {
        gl.shaderSource(shaders[shader], readStringFromPtr(string));
    },
    glCompileShader(shader) {
        gl.compileShader(shaders[shader]);
    },
    glGetShaderiv(shader, pname, params) {
        const buffer = new Uint32Array(instance.exports.memory.buffer, params, 1);
        buffer[0] = gl.getShaderParameter(shaders[shader], gl.COMPILE_STATUS);
    },
    glGetShaderInfoLog(shader, maxLength, length, infoLog) {
        writeString(infoLog, gl.getShaderInfoLog(shaders[shader]), length, maxLength);
    },
    glDeleteShader(shader) {
        gl.deleteShader(shaders[shader]);
        shaders[shader] = undefined;
    },

    glCreateProgram() {
        const program = programs.length;
        programs[program] = gl.createProgram();
        return program;
    },
    glAttachShader(program, shader) {
        gl.attachShader(programs[program], shaders[shader]);
    },
    glLinkProgram(program) {
        gl.linkProgram(programs[program]);
    },
    glUseProgram(program) {
        gl.useProgram(programs[program]);
    },

    glGenVertexArrays(n, arrays) {
        const buffer = new Uint32Array(instance.exports.memory.buffer, arrays, n);
        for (let i = 0; i < n; i++) {
            const vertexArray = vertexArrays.length;
            vertexArrays[vertexArray] = gl.createVertexArray();
            buffer[i] = vertexArray;
        }
    },
    glBindVertexArray(array) {
        gl.bindVertexArray(vertexArrays[array]);
    },

    glGenBuffers(n, _buffers) {
        const _buffer = new Uint32Array(instance.exports.memory.buffer, _buffers, n);
        for (let i = 0; i < n; i++) {
            const buffer = buffers.length;
            buffers[buffer] = gl.createBuffer();
            _buffer[i] = buffer;
        }
    },
    glBindBuffer(target, buffer) {
        gl.bindBuffer(target, buffers[buffer]);
    },
    glBufferData(target, size, data, usage) {
        gl.bufferData(target, new Uint8Array(instance.exports.memory.buffer, data, size), usage);
    },

    glGetUniformLocation(program, name) {
        const uniform = uniforms.length;
        uniforms[uniform] = gl.getUniformLocation(programs[program], readString(name));
        return uniform;
    },
    glUniformMatrix4fv(location, count, transpose, value) {
        gl.uniformMatrix4fv(uniforms[location], transpose, new Float32Array(instance.exports.memory.buffer, value, 16));
    },
    glGetAttribLocation(program, name) {
        const attribute = attributes.length;
        attributes[attribute] = gl.getAttribLocation(programs[program], readString(name));
        return attribute;
    },
    glVertexAttribPointer(index, size, type, normalized, stride, pointer) {
        gl.vertexAttribPointer(attributes[index], size, type, normalized, stride, pointer);
    },
    glEnableVertexAttribArray(index) {
        gl.enableVertexAttribArray(attributes[index]);
    },
    glDrawArrays(mode, first, count) {
        gl.drawArrays(mode, first, count);
    },

    glGenTextures(n, _textures) {
        const buffer = new Uint32Array(instance.exports.memory.buffer, _textures, n);
        for (let i = 0; i < n; i++) {
            const texture = textures.length;
            textures[texture] = gl.createTexture();
            buffer[i] = texture;
        }
    },
    glBindTexture(target, texture) {
        gl.bindTexture(target, textures[texture]);
    },
    glTexParameteri(target, pname, param) {
        gl.texParameteri(target, pname, param);
    },
    glTexImage2D(target, level, internalformat, width, height, border, format, type, pixels) {
        gl.texImage2D(target, level, internalformat, width, height, border, format, type, images[pixels - 1]);
    },
    glGenerateMipmap(target) {
        gl.generateMipmap(target);
    },
    glDeleteTextures(n, _textures) {
        const buffer = new Uint32Array(instance.exports.memory.buffer, _textures, n);
        for (let i = 0; i < n; i++) {
            gl.deleteTexture(textures[i]);
            textures[i] = undefined;
        }
    },

    loadTexture(path, ptr, callback) {
        const image = new Image();
        image.src = 'build/' + readString(path);
        image.onload = () => {
            const imageId = images.length + 1;
            images[imageId - 1] = image;
            instance.exports.table.get(callback)(ptr, image.width, image.height, imageId);
        };
    }
};

const useSIMD = await WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,5,1,96,0,1,123,3,2,1,0,10,10,1,8,0,65,0,253,15,253,98,11]));
const { instance } = await WebAssembly.instantiateStreaming(fetch(`build/game${useSIMD ? '-simd' : ''}.wasm`), { env: bindings });

function resize() {
    canvas.width = window.innerWidth * window.devicePixelRatio;
    canvas.height = window.innerHeight * window.devicePixelRatio;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    instance.exports.resize(window.innerWidth, window.innerHeight, window.devicePixelRatio);
}
window.addEventListener('resize', resize);
resize();

instance.exports.init();
let time = window.performance.now();
function loop() {
    if (!running) return;
    window.requestAnimationFrame(loop);
    const newTime = window.performance.now();
    instance.exports.update(Math.min((newTime - time) / 1000, 1));
    time = newTime;
    instance.exports.render();
}
loop();