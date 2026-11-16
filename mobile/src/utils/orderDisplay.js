export const orderReference = (id) => String(id).slice(-6).toUpperCase();
export const itemCount = (count = 0) => `${count} item${count === 1 ? '' : 's'}`;
