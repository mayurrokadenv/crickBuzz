import Swal from "sweetalert2";

const Alert = () => {
  return null;
};

export const showSuccess = async (
  title: string,
  message?: string
): Promise<void> => {
  await Swal.fire({
    icon: "success",
    title,
    text: message,
    confirmButtonColor: "#28a745",
    didOpen: () => {
    const container = document.querySelector(".swal2-container") as HTMLElement;
    if (container) {
        container.style.zIndex = "20000";
    }
    }
  });
};

export const showError = async (
  title: string,
  message?: string
): Promise<void> => {
  await Swal.fire({
    icon: "error",
    title,
    text: message,
    confirmButtonColor: "#dc3545",
    didOpen: () => {
        const container = document.querySelector(".swal2-container") as HTMLElement;
        if (container) {
            container.style.zIndex = "20000";
        }
    }
  });
};

export const showWarning = async (
  title: string,
  message?: string
): Promise<void> => {
  await Swal.fire({
    icon: "warning",
    title,
    text: message,
    confirmButtonColor: "#ffc107",
    didOpen: () => {
        const container = document.querySelector(".swal2-container") as HTMLElement;
        if (container) {
            container.style.zIndex = "20000";
        }
    }
  });
};

export const showInfo = async (
  title: string,
  message?: string
): Promise<void> => {
  await Swal.fire({
    icon: "info",
    title,
    text: message,
    confirmButtonColor: "#17a2b8",
    didOpen: () => {
        const container = document.querySelector(".swal2-container") as HTMLElement;
        if (container) {
            container.style.zIndex = "20000";
        }
    }
  });
};

export const showConfirm = async (
  title: string,
  text?: string
): Promise<boolean> => {
  const result =  await Swal.fire({
    title,
    text,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Yes",
    cancelButtonText: "No",
    confirmButtonColor: "#d33",
    cancelButtonColor: "#6c757d",
    reverseButtons: true,
    customClass: {
      popup: "swal-popup",
    },
  });
  return result.isConfirmed;
};

export default Alert;