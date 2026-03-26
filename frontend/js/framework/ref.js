// ===== ref — imperative DOM handle =====
// Creates a plain object { current } that a component assigns during render().
// Because the ref lives on `this`, it survives re-renders — current always
// points to the latest DOM node without needing a querySelector.
//
// Usage:
//   class SearchBox extends Component {
//     constructor(props) {
//       super(props);
//       this.inputRef = ref();
//     }
//
//     render() {
//       const input = document.createElement('input');
//       this.inputRef.current = input;   // assign in render
//       return input;
//     }
//
//     onMount() {
//       this.inputRef.current.focus();   // use in lifecycle
//     }
//   }

export function ref(initial = null) {
  return { current: initial };
}
